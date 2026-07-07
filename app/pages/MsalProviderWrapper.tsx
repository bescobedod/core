"use client"

import { MsalProvider } from "@azure/msal-react"
import { msalInstance } from "../lib/msalInstance"
import GlobalBackendErrorModal from "../components/GlobalBackendErrorModal";

export default function MsalProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MsalProvider instance={msalInstance}>
            {children}
            <GlobalBackendErrorModal />
        </MsalProvider>
    )
}