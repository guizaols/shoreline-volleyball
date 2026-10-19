import BeachMatch from '../BeachMatch';
import {matchOptions} from '../../lib/beach-progress';
export default async function Footvolley({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <BeachMatch sport="footvolley" {...matchOptions(await searchParams)}/>;}
