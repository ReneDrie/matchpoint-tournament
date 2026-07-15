"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../shared/config";
export function useStaffInvitation(token: string) { const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [accepted,setAccepted]=useState(false); async function submit(event:FormEvent){event.preventDefault();if(password!==confirm)return setError("De wachtwoorden komen niet overeen.");setBusy(true);setError("");const response=await fetch(`${API_URL}/api/auth/invitations/accept`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});const result=await response.json();if(!response.ok){setError(result.error??"Account activeren is niet gelukt.");setBusy(false);return;}setAccepted(true);} return {password,setPassword,confirm,setConfirm,busy,error,accepted,submit}; }
