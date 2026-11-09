// Conteúdo da Academia. Exercícios são validados localmente (modo demonstração, sem servidor).
export interface Exercise {
  id: string;
  prompt: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  short: string;
  objectives: string[];
  sections: { title: string; body: string[] }[];
  example: { title: string; body: string };
  code: { language: string; source: string; parts: { lines: string; text: string }[] };
  review: string[];
  exercises: Exercise[];
  defenses: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: "soc",
    title: "Fundamentos do SOC",
    short: "Como um centro de operações de segurança triagem, investiga e responde a alertas.",
    objectives: [
      "Entender o papel de um analista de SOC.",
      "Conhecer o ciclo de resposta: preparação, detecção, contenção, erradicação, recuperação e lições aprendidas.",
      "Diferenciar alerta, evento e incidente.",
    ],
    sections: [
      {
        title: "Evento, alerta e incidente",
        body: [
          "Um evento é qualquer ocorrência registrada (um login, uma requisição). Um alerta é um evento que uma regra considerou suspeito. Um incidente é um alerta confirmado que afeta confidencialidade, integridade ou disponibilidade.",
          "A maior parte do trabalho do SOC é triagem: decidir rapidamente quais alertas são falsos positivos e quais merecem investigação aprofundada.",
        ],
      },
      {
        title: "O ciclo de resposta (NIST SP 800-61)",
        body: [
          "Preparação → Detecção e análise → Contenção, erradicação e recuperação → Atividades pós-incidente.",
          "A regra de ouro: investigue antes de agir. Uma ação drástica sem evidência (desligar um servidor, bloquear um domínio) pode causar mais dano que o próprio ataque.",
        ],
      },
    ],
    example: {
      title: "Falso positivo bem tratado",
      body: "Um pico de erros 404 dispara um alerta. O analista verifica os logs, percebe que todos vêm de um link antigo divulgado pela própria instituição, registra o chamado com a causa raiz e aciona a comunicação. Nenhum sistema foi desligado.",
    },
    code: {
      language: "python",
      source: `# Triagem simples: classifica alertas por severidade e confiança
def prioridade(alerta):
    pesos = {"baixa": 1, "media": 2, "alta": 3, "critica": 4}
    base = pesos[alerta["severidade"]]
    # Ativos críticos (ex.: controlador de domínio) elevam a prioridade
    if alerta["ativo_critico"]:
        base += 2
    # Alertas já vistos como falso positivo recebem menos peso
    if alerta["fp_recorrente"]:
        base -= 1
    return max(base, 1)

fila = sorted(alertas, key=prioridade, reverse=True)`,
      parts: [
        { lines: "2-3", text: "Converte a severidade textual em número para poder ordenar." },
        { lines: "5-6", text: "O contexto do ativo importa tanto quanto a regra que disparou." },
        { lines: "8-9", text: "Histórico de falsos positivos reduz ruído, mas nunca zera o alerta." },
        { lines: "12", text: "A fila resultante define o que o analista olha primeiro." },
      ],
    },
    review: [
      "Qual a diferença entre um alerta e um incidente?",
      "Por que registrar um alerta mesmo quando ele é falso positivo?",
    ],
    exercises: [
      {
        id: "soc-1",
        prompt: "Um alerta de baixa severidade aparece no portal. Qual é o primeiro passo adequado?",
        options: ["Isolar o servidor imediatamente", "Investigar os logs relacionados ao alerta", "Ignorar, pois a severidade é baixa", "Reiniciar o serviço"],
        answer: 1,
        explanation: "Investigar antes de agir: evidências determinam se há incidente e qual resposta é proporcional.",
      },
      {
        id: "soc-2",
        prompt: "Em qual fase do ciclo de resposta ficam as 'lições aprendidas'?",
        options: ["Preparação", "Detecção", "Contenção", "Atividades pós-incidente"],
        answer: 3,
        explanation: "Após a recuperação, a equipe revisa o que ocorreu para melhorar controles e procedimentos.",
      },
    ],
    defenses: ["Documente toda triagem.", "Mantenha playbooks por tipo de incidente.", "Prefira ações proporcionais e reversíveis."],
  },
  {
    id: "phishing",
    title: "Phishing e engenharia social",
    short: "Como mensagens enganosas exploram a confiança humana e como detectá-las.",
    objectives: [
      "Reconhecer sinais de mensagens suspeitas.",
      "Analisar remetentes, domínios e cabeçalhos de autenticação (SPF, DKIM, DMARC).",
      "Executar uma resposta: quarentena, bloqueio, proteção de contas e comunicação.",
    ],
    sections: [
      {
        title: "Engenharia social",
        body: [
          "Engenharia social manipula pessoas em vez de sistemas. Gatilhos comuns: urgência ('em 24h'), autoridade ('a diretoria pediu'), medo ('sua conta será bloqueada') e recompensa ('você ganhou').",
          "Phishing é a forma mais comum: uma mensagem que leva a vítima a clicar num link, abrir um anexo ou entregar credenciais.",
        ],
      },
      {
        title: "Sinais técnicos",
        body: [
          "Typosquatting: domínios parecidos com o oficial (horiz0nte vs horizonte, rn vs m).",
          "Falhas de SPF/DKIM/DMARC indicam que o servidor remetente não está autorizado pelo domínio.",
          "Return-Path diferente do From, links cujo texto difere do destino real e anexos com extensão dupla (fatura.pdf.exe).",
        ],
      },
      {
        title: "Resposta",
        body: [
          "Quarentena da mensagem em todas as caixas, bloqueio do domínio malicioso, identificação de quem clicou (logs de proxy), redefinição de credenciais expostas e comunicação aos colaboradores.",
        ],
      },
    ],
    example: {
      title: "Comparando dois remetentes",
      body: "suporte@horiz0nte-coop.example (SPF fail, registrado há 2 dias) × rh@horizontecoop.example (SPF/DKIM/DMARC pass, domínio de 9 anos). O primeiro é malicioso; bloquear o segundo pararia a empresa.",
    },
    code: {
      language: "python",
      source: `# Detecta domínios parecidos com o oficial (typosquatting)
OFICIAL = "horizontecoop.example"
TROCAS = {"0": "o", "1": "l", "rn": "m", "-": ""}

def normaliza(dominio):
    d = dominio.lower()
    for falso, real in TROCAS.items():
        d = d.replace(falso, real)
    return d

def suspeito(remetente, spf_ok):
    dominio = remetente.split("@")[1]
    parecido = normaliza(dominio) == normaliza(OFICIAL)
    # Parece o oficial mas NÃO é o oficial: forte indício
    if parecido and dominio != OFICIAL:
        return True
    return not spf_ok`,
      parts: [
        { lines: "3", text: "Mapa de substituições visuais usadas por atacantes." },
        { lines: "5-9", text: "Normaliza o domínio para comparar a 'aparência', não os caracteres exatos." },
        { lines: "13-16", text: "Se a aparência coincide mas o texto difere, é imitação." },
        { lines: "17", text: "Mesmo sem imitação, falha de SPF é sinal de alerta." },
      ],
    },
    review: ["Que gatilhos emocionais aparecem em phishing?", "O que significa dmarc=fail?"],
    exercises: [
      {
        id: "ph-1",
        prompt: "Qual destes cabeçalhos indica maior risco?",
        options: ["spf=pass dkim=pass dmarc=pass", "spf=fail dkim=none dmarc=fail", "spf=pass dkim=pass dmarc=none", "Nenhum"],
        answer: 1,
        explanation: "Falha em SPF e DMARC, sem DKIM, mostra que o servidor não está autorizado pelo domínio alegado.",
      },
      {
        id: "ph-2",
        prompt: "Com base no código acima, o que `suspeito('a@horiz0ntecoop.example', True)` retorna?",
        code: "suspeito('a@horiz0ntecoop.example', True)",
        options: ["True", "False"],
        answer: 0,
        explanation: "normaliza troca '0' por 'o' e coincide com o oficial, mas o domínio real é diferente: imitação detectada, mesmo com SPF ok.",
      },
    ],
    defenses: ["Ative DMARC com política reject.", "Treine colaboradores com simulações autorizadas.", "Botão de reporte fácil no cliente de e-mail.", "MFA resistente a phishing (chaves FIDO2)."],
  },
  {
    id: "forca-bruta",
    title: "Ataques de força bruta",
    short: "Tentativas repetidas de autenticação: como ler logs e aplicar controles.",
    objectives: [
      "Distinguir força bruta, credential stuffing e password spraying.",
      "Interpretar registros de autenticação.",
      "Aplicar limitação de tentativas, bloqueio temporário e MFA.",
    ],
    sections: [
      {
        title: "Variações",
        body: [
          "Força bruta clássica: muitas senhas contra uma conta. Password spraying: poucas senhas comuns contra muitas contas (evita bloqueios por conta). Credential stuffing: pares usuário/senha vazados de outros serviços.",
        ],
      },
      {
        title: "Lendo os logs",
        body: [
          "Sinais: volume alto por IP, intervalo regular entre tentativas (sem pausa humana), muitos usuários distintos por origem e — o mais grave — um SUCCESS logo após uma sequência de FAIL.",
          "Poucas falhas seguidas de sucesso, vindas da rede da empresa, geralmente são erros de digitação.",
        ],
      },
      {
        title: "Controles",
        body: [
          "Limitação de taxa por conta e por IP, bloqueio temporário progressivo, MFA, senhas fortes verificadas contra listas de vazamento e alertas para sucesso após falhas.",
        ],
      },
    ],
    example: {
      title: "Sucesso suspeito",
      body: "203.0.113.45 gera 398 falhas e, às 10:09:47, um SUCCESS em admin.recepcao. Bloquear o IP não basta: a conta está comprometida e precisa ter sessões revogadas e senha redefinida.",
    },
    code: {
      language: "python",
      source: `from collections import defaultdict

# Conta falhas por IP numa janela e marca sucesso após falhas
def analisa(eventos, limite=20):
    falhas = defaultdict(int)
    alertas = []
    for ev in eventos:  # cada ev: {ip, usuario, resultado}
        if ev["resultado"] == "FAIL":
            falhas[ev["ip"]] += 1
            if falhas[ev["ip"]] == limite:
                alertas.append(("volume", ev["ip"]))
        elif falhas[ev["ip"]] >= limite:
            # login bem-sucedido vindo de uma origem ruidosa
            alertas.append(("comprometida", ev["usuario"]))
    return alertas`,
      parts: [
        { lines: "5-6", text: "Um contador por IP e uma lista de alertas gerados." },
        { lines: "8-11", text: "Ao atingir o limite, gera alerta de volume uma única vez." },
        { lines: "12-14", text: "Sucesso vindo de uma origem que já falhou muito indica conta comprometida." },
      ],
    },
    review: ["Por que password spraying escapa de bloqueio por conta?", "O que fazer quando há SUCCESS após muitas falhas?"],
    exercises: [
      {
        id: "fb-1",
        prompt: "Um IP tenta a senha 'Verao2026!' em 500 contas diferentes. Que ataque é esse?",
        options: ["Força bruta clássica", "Password spraying", "DDoS", "Phishing"],
        answer: 1,
        explanation: "Poucas senhas comuns contra muitas contas caracterizam password spraying.",
      },
      {
        id: "fb-2",
        prompt: "Qual controle reduz a eficácia do ataque mesmo se o atacante trocar de IP?",
        options: ["Bloquear apenas o IP atual", "Limitação de tentativas por conta + MFA", "Desligar o portal", "Aumentar o servidor"],
        answer: 1,
        explanation: "Limites por conta e MFA independem da origem; bloquear um IP é contornável.",
      },
    ],
    defenses: ["MFA obrigatório em contas administrativas.", "Rate limiting por conta e IP.", "Alertas de sucesso após falhas.", "Verificação de senhas vazadas."],
  },
  {
    id: "ddos",
    title: "DDoS e disponibilidade",
    short: "Negação de serviço distribuída: identificar tráfego anômalo e mitigar sem derrubar clientes.",
    objectives: [
      "Entender ataques volumétricos, de protocolo e de aplicação (camada 7).",
      "Diferenciar tráfego legítimo de anômalo em gráficos e logs.",
      "Aplicar limitação, filtragem e monitorar a recuperação.",
    ],
    sections: [
      {
        title: "Tipos",
        body: [
          "Volumétrico: satura o link (ex.: amplificação UDP). Protocolo: esgota tabelas de conexão (SYN flood). Aplicação: requisições aparentemente válidas contra rotas caras (ex.: busca sem cache).",
        ],
      },
      {
        title: "Legítimo × anômalo",
        body: [
          "Clientes reais variam origem, User-Agent e navegam por várias páginas com cookies. Bots tendem a repetir o mesmo padrão, mesma rota, sem sessão, de faixas concentradas.",
          "Um pico de vendas legítimo também aumenta o tráfego — por isso a análise de padrão vem antes do bloqueio.",
        ],
      },
      {
        title: "Mitigação",
        body: [
          "Filtrar origens confirmadas, rate limiting por rota, cache em rotas caras, WAF, CDN/scrubbing do provedor e autoescala para ganhar tempo. Nunca bloqueie todo o tráfego: isso entrega ao atacante o resultado desejado.",
        ],
      },
    ],
    example: {
      title: "Rota cara",
      body: "GET /busca?q=<aleatório> evita qualquer cache e força uma consulta ao banco por requisição. Limitar a taxa e cachear essa rota protege o banco mesmo se a botnet trocar de faixa.",
    },
    code: {
      language: "python",
      source: `import time

# Token bucket: cada cliente recebe 'capacidade' fichas que recarregam
class Limite:
    def __init__(self, capacidade=10, recarga_s=1.0):
        self.cap, self.recarga = capacidade, recarga_s
        self.fichas, self.ultimo = {}, {}

    def permitir(self, cliente):
        agora = time.monotonic()
        f = self.fichas.get(cliente, self.cap)
        decorrido = agora - self.ultimo.get(cliente, agora)
        f = min(self.cap, f + decorrido / self.recarga)
        self.ultimo[cliente] = agora
        if f < 1:
            self.fichas[cliente] = f
            return False  # responde 429 Too Many Requests
        self.fichas[cliente] = f - 1
        return True`,
      parts: [
        { lines: "4-7", text: "Cada cliente tem um balde com fichas; capacidade define rajadas permitidas." },
        { lines: "10-13", text: "Fichas recarregam proporcionalmente ao tempo decorrido." },
        { lines: "15-17", text: "Sem fichas, a requisição é recusada com 429 em vez de sobrecarregar o servidor." },
      ],
    },
    review: ["Por que bloquear todo o tráfego não é mitigação?", "Que sinais diferenciam um bot de um cliente?"],
    exercises: [
      {
        id: "dd-1",
        prompt: "Qual sinal mais indica tráfego de bot?",
        options: ["Origens variadas com cookies de sessão", "Mesmo User-Agent, mesma rota, sem sessão, de uma única faixa", "Pico às 21h em dia de promoção", "Navegação por várias páginas de produto"],
        answer: 1,
        explanation: "Padrão repetitivo e concentrado é típico de automação; picos de promoção podem ser legítimos.",
      },
      {
        id: "dd-2",
        prompt: "No token bucket acima, com capacidade 10, quantas requisições instantâneas um cliente novo consegue?",
        options: ["1", "5", "10", "Ilimitadas"],
        answer: 2,
        explanation: "O balde começa cheio (capacidade 10); depois recarrega 1 ficha por segundo.",
      },
    ],
    defenses: ["Cache e rate limiting em rotas caras.", "CDN/WAF na frente da aplicação.", "Plano de contato com o provedor.", "Autoescala com limites de custo."],
  },
  {
    id: "malware",
    title: "Malware e resposta a incidentes",
    short: "Categorias de malware, indicadores de comprometimento e a ordem correta da resposta.",
    objectives: [
      "Conhecer categorias: trojan, ransomware, worm, spyware.",
      "Identificar IoCs: hashes, domínios, chaves de persistência, processos.",
      "Executar contenção, preservação de evidências, erradicação e recuperação na ordem certa.",
    ],
    sections: [
      {
        title: "Categorias",
        body: [
          "Trojan: disfarça-se de algo útil. Worm: se propaga sozinho. Ransomware: cifra dados e exige resgate. Spyware/infostealer: coleta credenciais e dados. RAT: dá controle remoto ao atacante.",
        ],
      },
      {
        title: "Indicadores de comprometimento (IoC)",
        body: [
          "Hashes de arquivos conhecidos, domínios de comando e controle (C2), processos com pai incomum (outlook.exe → .exe), chaves de inicialização (Run), serviços novos e varreduras internas (SMB).",
        ],
      },
      {
        title: "Ordem da resposta",
        body: [
          "1) Isolar o host pela rede (sem desligar: a memória contém evidências). 2) Bloquear o C2. 3) Coletar evidências (memória, disco, logs, hashes). 4) Erradicar e restaurar a partir de imagem limpa. 5) Redefinir credenciais e documentar.",
          "Apagar o arquivo manualmente é um erro clássico: perde a amostra e raramente remove a persistência.",
        ],
      },
    ],
    example: {
      title: "Cadeia típica",
      body: "Anexo fatura_pdf.exe aberto pelo Outlook → cria chave Run para upd.exe → conecta a update-sync.example → varre a rede via SMB. Cada passo é um IoC e um ponto de detecção.",
    },
    code: {
      language: "python",
      source: `# Verificação INERTE de IoCs em eventos de EDR (somente leitura)
IOC_HASHES = {"e3b0...9f21"}          # hashes fictícios
IOC_DOMINIOS = {"update-sync.example"}
PAIS_SUSPEITOS = {"outlook.exe", "winword.exe"}

def avalia(ev):
    sinais = []
    if ev.get("sha256") in IOC_HASHES:
        sinais.append("hash conhecido")
    if ev.get("destino") in IOC_DOMINIOS:
        sinais.append("contato com C2")
    if ev.get("pai") in PAIS_SUSPEITOS and ev.get("proc", "").endswith(".exe"):
        sinais.append("executável iniciado por app de escritório")
    if "\\\\Run\\\\" in ev.get("registro", ""):
        sinais.append("persistência em chave Run")
    return sinais`,
      parts: [
        { lines: "2-4", text: "Listas de indicadores — em produção viriam de inteligência de ameaças." },
        { lines: "8-11", text: "Correspondência direta de hash e domínio C2." },
        { lines: "12-13", text: "Heurística de comportamento: app de escritório não deveria iniciar executáveis." },
        { lines: "14-15", text: "Persistência é o que faz o malware sobreviver a reinicializações." },
      ],
    },
    review: ["Por que isolar em vez de desligar?", "Por que coletar evidências antes de restaurar?"],
    exercises: [
      {
        id: "mw-1",
        prompt: "Qual a ordem correta?",
        options: ["Restaurar → isolar → coletar evidências", "Isolar → coletar evidências → restaurar", "Apagar o arquivo → restaurar", "Coletar evidências → aguardar → isolar"],
        answer: 1,
        explanation: "Conter primeiro limita o dano; evidências antes da restauração; recuperação por último.",
      },
      {
        id: "mw-2",
        prompt: "Qual destes é um indicador de persistência?",
        options: ["Hash de um PDF legítimo", "Chave HKCU\\...\\Run apontando para %AppData%\\upd.exe", "Login bem-sucedido às 9h", "Uso de 20% de CPU"],
        answer: 1,
        explanation: "Chaves Run executam o programa a cada logon, mantendo o malware ativo.",
      },
    ],
    defenses: ["EDR com isolamento remoto.", "Bloqueio de executáveis em anexos.", "Backups testados e imagens padrão.", "Privilégio mínimo para usuários."],
  },
];

export const getLesson = (id: string) => LESSONS.find((l) => l.id === id);
