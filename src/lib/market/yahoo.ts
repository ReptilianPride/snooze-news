import YahooFinance from "yahoo-finance2"
import {SECTORS} from "./sectors"
import { AnomalyResult, computeAnomaly } from "./anomaly";

const yahooFinance = new YahooFinance();

export type DailyBar = {
    date:string;
    close:number
}

export type SectorSnapshot = {
    symbol: string;
    name: string;
    price: number|null;
    previousClose:number|null;
    changePercent:number|null;
    history:DailyBar[];
    anomaly: AnomalyResult|null;
    error?:string;
}

async function fetchSector(symbol:string, name:string): Promise<SectorSnapshot>{
    try{
        const period1 = new Date(Date.now() - 90*24*60*60*1000);
        const result = await yahooFinance.chart(symbol, {period1, interval: "1d"});

        const history: DailyBar[] = result.quotes
            .filter((q)=>typeof q.close === "number")
            .map((q)=>({
                date:q.date.toISOString().slice(0,10),
                close: q.close as number
            }));
        
        if(history.length < 2) throw new Error("Not enough history returned");

        const closes=history.map((h)=>h.close);
        const anomaly=computeAnomaly(closes);

        const latest = history[history.length-1];
        const previous = history[history.length-2];

        return {
            symbol,
            name,
            price: latest.close,
            previousClose: previous.close,
            changePercent: ((latest.close - previous.close)/previous.close)*100,
            history,
            anomaly
        };
    } catch(err){
        return {
            symbol,
            name,
            price:null,
            previousClose:null,
            changePercent:null,
            history:[],
            anomaly:null,
            error: err instanceof Error ? err.message : "Unknown Error"
        };
    }
}

export function fetchAllSectors(): Promise<SectorSnapshot[]>{
    return Promise.all(SECTORS.map((s)=>fetchSector(s.symbol,s.name)));
}