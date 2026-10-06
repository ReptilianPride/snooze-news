import { NextResponse } from "next/server";
import { fetchAllSectors } from "@/lib/market/yahoo";

export const dynamic = "force-dynamic";

// export async function GET(){
//     const sectors = await fetchAllSectors();
//     const okCount = sectors.filter((s)=>!s.error).length

//     return NextResponse.json(
//         {updatedAt: new Date().toISOString(), okCount, sectors},
//         {status: okCount === 0 ? 502 : 200}
//     );
// }

export async function GET(){
    const sectors = await fetchAllSectors();
    const okCount = sectors.filter((s)=>!s.error).length;

    const ranked = [...sectors].sort((a,b)=>{
        const az = Math.abs(a.anomaly?.zScore ?? 0);
        const bz = Math.abs(b.anomaly?.zScore ?? 0);
        return az-bz;
    });

    const anomalies = ranked.filter((s)=>s.anomaly?.isAnomaly)
        .map((s)=>({
            symbol:s.symbol,
            name:s.name,
            zScore:s.anomaly!.zScore,
            changePercent:s.changePercent,
        }));

    return NextResponse.json(
        {updatedAt: new Date().toISOString(), okCount, anomalies, sectors:ranked},
        {status:okCount === 0 ? 502 : 200}
    )
}