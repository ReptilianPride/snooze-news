const BASE_URL = process.env.OPENCODE_BASE_URL!;
const PROVIDER_ID = process.env.OPENCODE_PROVIDER_ID!;
const MODEL_ID = process.env.OPENCODE_MODEL_ID!;

type Part = {
    type:string;
    text?:string;
};

type MessageResponse = {
    info:unknown,
    parts: Part[]
};

async function createSession(): Promise<string>{
    const res = await fetch(`${BASE_URL}/session`,{method:"POST"});
    if(!res.ok) throw new Error(`Opencode: failed to create session (${res.status})`);
    const session = await res.json();
    return session.id;
}

export async function askOpenCode(prompt:string): Promise<string>{
    const sessionId = await createSession();

    const res = await fetch(`${BASE_URL}/session/${sessionId}/message`,{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            model:{providerID: PROVIDER_ID, modelID: MODEL_ID},
            parts: [{type:"text",text:prompt}],
        }),
    });

    if(!res.ok){
        const body = await res.text().catch(()=>"<no body>")
        throw new Error(`Opencode: message failed (${res.status}): ${body}`);
    }

    const data: MessageResponse = await res.json();

    return data.parts
        .filter((p)=>p.type === "text" && p.text)
        .map((p)=>p.text)
        .join("\n")
        .trim();
}