import { StaffInvitation } from "../../components/StaffInvitation/StaffInvitation";
export default async function UitnodigingPage({searchParams}:{searchParams:Promise<{token?:string}>}){const {token=""}=await searchParams;return <StaffInvitation token={token}/>;}
