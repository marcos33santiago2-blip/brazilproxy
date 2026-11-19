import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  {
    q: "Qual a diferença entre SOCKS5 e HTTP/HTTPS?",
    a: "HTTP/HTTPS funciona para navegação e requisições web, sendo o mais compatível com navegadores e ferramentas. SOCKS5 trabalha em um nível mais baixo, aceita qualquer tipo de tráfego (TCP/UDP), é ideal para antidetect, bots, jogos e apps, e não altera cabeçalhos. Todos os nossos proxies suportam os dois protocolos — você escolhe no painel.",
  },
  {
    q: "Quanto tempo leva para ativar depois do Pix?",
    a: "A confirmação do Pix é automática e leva em média 5 a 30 segundos. Assim que o pagamento é confirmado, os proxies aparecem na sua Área do Cliente com IP, porta, usuário e senha prontos para uso.",
  },
  {
    q: "Funciona com Dolphin Anty, AdsPower e outros antidetect?",
    a: "Sim. Basta copiar o proxy no formato IP:Porta:Usuário:Senha e colar no perfil. Temos tutoriais passo a passo para AdsPower, Dolphin Anty, Multilogin, Incogniton, GoLogin, além de Python, Puppeteer e Playwright.",
  },
  {
    q: "Posso trocar o IP? Qual é a política de troca?",
    a: "Proxies ISP e Datacenter têm 1 troca gratuita a cada 7 dias direto pelo painel (botão “Trocar IP”). Se o IP apresentar bloqueio ou instabilidade, nossa equipe troca na hora sem custo. Residenciais e móveis já possuem rotação automática ou troca via link/API.",
  },
  {
    q: "Como funcionam os Painéis Filhos (white-label)?",
    a: "Você ganha um painel completo com seu domínio, sua logo, suas cores e seus preços. Seus clientes compram de você, pagam no seu Pix/gateway, e a entrega dos IPs acontece automaticamente pela nossa infraestrutura. Você só paga o preço de atacado (até 60% de desconto) e fica com a diferença.",
  },
  {
    q: "Existe reembolso ou período de teste?",
    a: "Oferecemos teste de 1 GB residencial ou 1 IP ISP por 1 hora mediante cadastro verificado. Se o proxy não funcionar como descrito nas primeiras 24 h, devolvemos o valor em saldo.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <div className="text-sm font-semibold text-primary">FAQ</div>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h2>
          <p className="mt-3 text-muted-foreground">Não encontrou o que procura? Nosso suporte responde em minutos, 24 horas por dia.</p>
        </div>
        <Accordion type="single" collapsible defaultValue="item-0" className="rounded-2xl border bg-card px-6 shadow-soft">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="last:border-b-0">
              <AccordionTrigger className="py-5 text-left font-display text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
