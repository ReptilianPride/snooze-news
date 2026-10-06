export function dailyReturns(closes: number[]): number[]{
    const returns: number[] = [];
    for(let i=1;i<closes.length;i++){
        returns.push(closes[i]/closes[i-1]-1)
    }
    return returns;
}

export function mean(values: number[]):number{
    return values.reduce((total, number)=>total+number,0)/values.length;
}

export function stdDev(values: number[]):number{
    const m=mean(values);
    const varience=values.reduce((total,value)=>total+(value-m)**2,0)/(values.length-1);
    return Math.sqrt(varience);
}

export function zScore(value:number, baselineMean:number, baselineStd:number):number{
    if(baselineStd===0) return 0;
    return (value-baselineMean)/baselineStd
}