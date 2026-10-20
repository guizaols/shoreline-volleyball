import BeachMatch from '../BeachMatch';
import {matchOptions} from '../../lib/beach-progress';
export default async function BeachTennis({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <BeachMatch sport="tennis" {...matchOptions(await searchParams)}/>;}
