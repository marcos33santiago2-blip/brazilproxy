import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, Plus } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/DashboardShell";
import { ProxyTable } from "@/components/dashboard/ProxyTable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cliente/proxies")({ component: ProxiesPage });

function ProxiesPage() {
  return (
    <>
      <PageHeader
        title="Meus Proxies Ativos"
        description="Copie credenciais com 1 clique, teste a conexão, troque o IP ou renove."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/cliente/gerador">
                <FileDown /> Exportar lista
              </Link>
            </Button>
            <Button variant="brand" asChild>
              <Link to="/cliente/comprar">
                <Plus /> Novo proxy
              </Link>
            </Button>
          </>
        }
      />
      <Panel>
        <ProxyTable />
      </Panel>
    </>
  );
}
