import {UserRole} from '../types';
export function navigationPath(role:UserRole,view:string){
 if(role==='assessor')return '/assessor/dashboard';
 if(role==='admin')return '/admin/dashboard';
 return '/beneficiary/'+(['dashboard','mentor','improvement'].includes(view)?view:'dashboard');
}
export function validActiveUser(value:unknown):value is {role:UserRole;id:string;name:string}{
 const user=value as {role?:unknown;id?:unknown;name?:unknown}|null;
 return !!user&&['beneficiary','assessor','admin'].includes(String(user.role))&&typeof user.id==='string'&&!!user.id.trim()&&typeof user.name==='string';
}
