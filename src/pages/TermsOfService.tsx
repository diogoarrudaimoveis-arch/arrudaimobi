import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTenantSettings } from "@/hooks/use-tenant-settings";

const TermsOfService = () => {
  const navigate = useNavigate();
  const { data: tenant } = useTenantSettings();
  const companyName = tenant?.name || "Sua Imobiliária";

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="font-display text-3xl font-bold text-foreground">Termos de Serviço</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 05 de abril de 2026</p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground/90 space-y-6">
          <h2 className="font-display text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
          <p>Ao acessar ou utilizar a plataforma {companyName} ("Plataforma"), você concorda em cumprir estes Termos de Serviço. Caso não concorde, não utilize a Plataforma.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
          <p>A {companyName} é uma plataforma SaaS (Software as a Service) de gestão imobiliária multi-tenant que permite a imobiliárias e corretores gerenciar imóveis, leads, agentes e contatos de forma centralizada.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">3. Cadastro e Conta</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Você deve fornecer informações verdadeiras e atualizadas ao se cadastrar.</li>
            <li>É sua responsabilidade manter a segurança de suas credenciais de acesso.</li>
            <li>Cada conta é pessoal e intransferível.</li>
            <li>Você é responsável por todas as atividades realizadas em sua conta.</li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-foreground">4. Uso Aceitável</h2>
          <p>Ao utilizar a Plataforma, você concorda em:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Não utilizar o serviço para atividades ilegais ou não autorizadas.</li>
            <li>Não tentar acessar dados de outros tenants ou usuários.</li>
            <li>Não realizar engenharia reversa, modificar ou distribuir o software.</li>
            <li>Não enviar conteúdo ofensivo, spam ou material que viole direitos de terceiros.</li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-foreground">5. Propriedade Intelectual</h2>
          <p>Todo o conteúdo da Plataforma, incluindo código-fonte, design, logotipos e textos, é de propriedade exclusiva da {companyName} e está protegido por leis de propriedade intelectual.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">6. Dados e Conteúdo do Usuário</h2>
          <p>Você mantém a propriedade dos dados inseridos na Plataforma. Ao utilizá-la, você concede à {companyName} uma licença limitada para processar, armazenar e exibir seus dados exclusivamente para a prestação do serviço.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">7. Disponibilidade e Suporte</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nos esforçamos para manter a Plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta.</li>
            <li>Manutenções programadas serão comunicadas com antecedência.</li>
            <li>O suporte técnico está disponível nos canais oficiais.</li>
          </ul>

          <h2 className="font-display text-xl font-semibold text-foreground">8. Limitação de Responsabilidade</h2>
          <p>A {companyName} não se responsabiliza por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou impossibilidade de uso da Plataforma, incluindo, mas não se limitando a, perda de dados, lucros cessantes ou interrupção de negócios.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">9. Rescisão</h2>
          <p>Podemos suspender ou encerrar sua conta a qualquer momento em caso de violação destes Termos. Você pode encerrar sua conta a qualquer momento entrando em contato com nosso suporte.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">10. Alterações nos Termos</h2>
          <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão notificadas por email ou na Plataforma. O uso contínuo após as alterações constitui aceitação dos novos termos.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">11. Legislação Aplicável</h2>
          <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca da sede da empresa.</p>

          <h2 className="font-display text-xl font-semibold text-foreground">12. Contato</h2>
          <p>Para dúvidas sobre estes Termos, entre em contato através da página de contato da Plataforma.</p>
        </div>
      </section>
    </Layout>
  );
};

export default TermsOfService;
