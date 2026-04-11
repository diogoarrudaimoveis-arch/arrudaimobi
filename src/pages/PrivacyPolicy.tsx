import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { data: tenant } = useTenantSettings();
  const companyName = tenant?.name || "Sua Imobiliária";

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-legal", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("privacy_policy_content")
        .eq("tenant_id", tenant?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id,
  });

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="font-display text-3xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 05 de abril de 2026</p>

        {siteSettings?.privacy_policy_content ? (
          <div 
            className="prose prose-sm mt-8 max-w-none text-foreground/90 space-y-6"
            dangerouslySetInnerHTML={{ __html: siteSettings.privacy_policy_content }}
          />
        ) : (
          <div className="prose prose-sm mt-8 max-w-none text-foreground/90 space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Introdução</h2>
            <p>A {companyName} respeita sua privacidade e está comprometida em proteger seus dados pessoais. Esta Política descreve como coletamos, utilizamos, armazenamos e protegemos suas informações em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>

            <h2 className="font-display text-xl font-semibold text-foreground">2. Dados Coletados</h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome completo, email, telefone e senha (armazenada de forma criptografada).</li>
              <li><strong>Dados de uso:</strong> informações sobre como você interage com a Plataforma, incluindo páginas acessadas, funcionalidades utilizadas e horários de acesso.</li>
              <li><strong>Dados de imóveis:</strong> informações sobre imóveis cadastrados, incluindo endereço, fotos, características e valores.</li>
              <li><strong>Dados de contato:</strong> mensagens enviadas através dos formulários de contato da Plataforma.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e informações de dispositivo.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-foreground">3. Finalidade do Uso dos Dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prover e manter o funcionamento da Plataforma.</li>
              <li>Autenticar e autorizar o acesso à sua conta.</li>
              <li>Processar e gerenciar os dados imobiliários inseridos.</li>
              <li>Enviar comunicações relacionadas ao serviço (recuperação de senha, notificações de sistema).</li>
              <li>Melhorar a experiência do usuário e otimizar a Plataforma.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-foreground">4. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Seus dados podem ser compartilhados apenas nas seguintes situações:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Com provedores de infraestrutura necessários para a operação do serviço.</li>
              <li>Quando exigido por lei, ordem judicial ou autoridade governamental competente.</li>
              <li>Para proteger os direitos, propriedade ou segurança da {companyName} ou de seus usuários.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-foreground">5. Armazenamento e Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) e em repouso.</li>
              <li>Senhas são armazenadas utilizando algoritmos de hash seguros (bcrypt).</li>
              <li>Implementamos políticas de acesso restrito (Row Level Security) para garantir isolamento entre tenants.</li>
              <li>Realizamos backups regulares para proteção contra perda de dados.</li>
              <li>Monitoramos continuamente a infraestrutura contra ameaças de segurança.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-foreground">6. Retenção de Dados</h2>
            <p>Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta Política ou conforme exigido por lei. Após o encerramento da conta, seus dados serão excluídos em até 30 dias, exceto quando houver obrigação legal de retenção.</p>

            <h2 className="font-display text-xl font-semibold text-foreground">7. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Acesso:</strong> solicitar uma cópia dos seus dados pessoais.</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incompletos ou desatualizados.</li>
              <li><strong>Eliminação:</strong> solicitar a exclusão dos seus dados pessoais.</li>
              <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados para outro serviço.</li>
              <li><strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento.</li>
              <li><strong>Informação:</strong> ser informado sobre o compartilhamento de dados com terceiros.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-foreground">8. Cookies</h2>
            <p>A Plataforma utiliza cookies estritamente necessários para autenticação e manutenção da sessão do usuário. Não utilizamos cookies de rastreamento de terceiros para fins publicitários.</p>

            <h2 className="font-display text-xl font-semibold text-foreground">9. Menores de Idade</h2>
            <p>A Plataforma não é direcionada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos dados de menores, eles serão excluídos imediatamente.</p>

            <h2 className="font-display text-xl font-semibold text-foreground">10. Alterações nesta Política</h2>
            <p>Podemos atualizar esta Política periodicamente. Alterações significativas serão notificadas por email ou na Plataforma. Recomendamos a revisão periódica desta página.</p>

            <h2 className="font-display text-xl font-semibold text-foreground">11. Contato e Encarregado (DPO)</h2>
            <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta Política, entre em contato através da página de contato da Plataforma ou pelo email do Encarregado de Proteção de Dados.</p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
