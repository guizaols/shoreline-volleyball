export function project(x:number,z:number,y=450){
 return {x:95+x*.77+z*.20,y:245+z*.66-x*.035-(450-y)*.68};
}
