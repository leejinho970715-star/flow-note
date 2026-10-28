import type {Metadata} from 'next';
import Workspace from './workspace';
export const metadata:Metadata={title:'협업 워크스페이스',robots:{index:false,follow:true},alternates:{canonical:'/workspace/'}};
export default function Page(){return <Workspace/>;}
