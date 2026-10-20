import BeachMatch from '../BeachMatch';
import {matchOptions} from '../../lib/beach-progress';
export default async function BeachSoccer({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <BeachMatch sport="soccer" {...matchOptions(await searchParams)}/>;}
