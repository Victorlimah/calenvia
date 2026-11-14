"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DEMO_SVGS, type DemoSvg } from "./demo-svgs";

type Demo = {
  name: string;
  url: string;
  title: [string, string, string]; // antes, destaque, depois
  svg: DemoSvg;
  booking: string;
  customer: string;
  service: string;
  when: string;
  colors: { bg: string; fg: string; sub: string; accent: string; btn: string; avatar: string };
};

const DEMOS: Demo[] = [
  {
    name: "Barbearia do João",
    url: "barbeariadojoao",
    title: ["Seu corte ", "no ponto", ". Sem fila."],
    svg: "barbearia",
    booking: "Corte · ter, 14:00",
    customer: "Lucas",
    service: "Corte",
    when: "ter, 14:00",
    colors: {
      bg: "#0f0f0f",
      fg: "#f5f2ea",
      sub: "#c9c4b9",
      accent: "#e8b04a",
      btn: "#111111",
      avatar: "#2a2a2a",
    },
  },
  {
    name: "Studio Bella Unha",
    url: "studiobellaunha",
    title: ["Unhas impecáveis, ", "na sua hora", "."],
    svg: "manicure",
    booking: "Pé e mão · qui, 16:00",
    customer: "Juliana",
    service: "Pé e mão",
    when: "qui, 16:00",
    colors: {
      bg: "#fff5f7",
      fg: "#3a1f29",
      sub: "#7d5563",
      accent: "#D6456A",
      btn: "#ffffff",
      avatar: "#f6cfd9",
    },
  },
  {
    name: "Clínica Movimento",
    url: "clinicamovimento",
    title: ["Cuide do corpo ", "sem espera", "."],
    svg: "clinica",
    booking: "Fisioterapia · qua, 09:30",
    customer: "Carla",
    service: "Fisioterapia",
    when: "qua, 09:30",
    colors: {
      bg: "#f3f8f6",
      fg: "#12302b",
      sub: "#44615b",
      accent: "#14806B",
      btn: "#ffffff",
      avatar: "#cfe3de",
    },
  },
  {
    name: "Espaço Acolher",
    url: "espacoacolher",
    title: ["Um espaço para você ", "ser ouvido", "."],
    svg: "psicologa",
    booking: "Sessão · seg, 19:00",
    customer: "Marina",
    service: "Sessão",
    when: "seg, 19:00",
    colors: {
      bg: "#fbf6ef",
      fg: "#3b2a1e",
      sub: "#7a6352",
      accent: "#B8613F",
      btn: "#ffffff",
      avatar: "#ecdcc8",
    },
  },
  {
    name: "Patas & Cia",
    url: "patasecia",
    title: ["Banho e tosa ", "no horário certo", "."],
    svg: "pet",
    booking: "Banho e tosa · sex, 10:00",
    customer: "Bia",
    service: "Banho e tosa",
    when: "sex, 10:00",
    colors: {
      bg: "#fff6ee",
      fg: "#3a2416",
      sub: "#7a5a45",
      accent: "#D9622B",
      btn: "#ffffff",
      avatar: "#f6d8bf",
    },
  },
  {
    name: "Studio Forma",
    url: "studioforma",
    title: ["Seu treino ", "com horário garantido", "."],
    svg: "pilates",
    booking: "Pilates · sáb, 08:00",
    customer: "Rafael",
    service: "Pilates",
    when: "sáb, 08:00",
    colors: {
      bg: "#f5f3ff",
      fg: "#241f3d",
      sub: "#5d5780",
      accent: "#6C5CE0",
      btn: "#ffffff",
      avatar: "#ddd8fb",
    },
  },
  {
    name: "Brilho Lava-Jato",
    url: "brilholavajato",
    title: ["Seu carro brilhando, ", "sem fila", "."],
    svg: "lavajato",
    booking: "Lavagem completa · sex, 15:00",
    customer: "Pedro",
    service: "Lavagem completa",
    when: "sex, 15:00",
    colors: {
      bg: "#f2f8fd",
      fg: "#10263a",
      sub: "#4a6378",
      accent: "#1E6FD9",
      btn: "#ffffff",
      avatar: "#d3e6f7",
    },
  },
];

/** Celular de exemplo que alterna entre tipos de negócio (decorativo). */
export function PhoneDemo({ rootDomain }: { rootDomain: string }) {
  const [i, setI] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setFading(true);
      t = setTimeout(() => {
        setI((n) => (n + 1) % DEMOS.length);
        setFading(false);
      }, 350);
    }, 3500);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);

  const d = DEMOS[i];
  const c = d.colors;
  const vars = {
    "--p-bg": c.bg,
    "--p-fg": c.fg,
    "--p-sub": c.sub,
    "--p-accent": c.accent,
    "--p-btn": c.btn,
    "--p-avatar": c.avatar,
  } as CSSProperties;

  return (
    <div className="mockup">
      <div className="phone" style={vars}>
        <div className={`phone-inner${fading ? "fading" : ""}`}>
          <div className="phone-top">
            <span className="phone-avatar" />
            <span>{d.name}</span>
          </div>
          <div className="phone-photo" dangerouslySetInnerHTML={{ __html: DEMO_SVGS[d.svg] }} />
          <div className="phone-body">
            <div className="phone-title">
              {d.title[0]}
              <span>{d.title[1]}</span>
              {d.title[2]}
            </div>
            <div className="phone-sub">Escolha o serviço e o horário em menos de 1 minuto.</div>
            <div className="phone-btn">Agendar meu horário</div>
          </div>
          <div className="phone-url">
            {d.url}.{rootDomain}
          </div>
        </div>
      </div>
      <div className="float float-booking">
        <span className="ic">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <div>
          <b>Novo agendamento</b>
          <span>{d.booking}</span>
        </div>
      </div>
      <div className="float float-wpp">
        <div className="t">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          WhatsApp · agora
        </div>
        <p>
          Olá, {d.customer}! Seu horário de <b>{d.service}</b> está confirmado para <b>{d.when}</b>.
          Para remarcar, toque no link.
        </p>
      </div>
    </div>
  );
}
