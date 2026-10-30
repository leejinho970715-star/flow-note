import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
const tabs = [...document.querySelectorAll('[role="tab"][data-product]')];
const panels = [...document.querySelectorAll("[data-product-panel]")];
let animatePanel = () => {};
function activateProduct(
  id,
  { focus = false, updateUrl = false, animate = true } = {},
) {
  const selected = tabs.find((tab) => tab.dataset.product === id);
  if (!selected) return;
  const changed = selected.getAttribute("aria-selected") !== "true";
  tabs.forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== id;
  });
  if (focus) selected.focus({ preventScroll: true });
  if (updateUrl) history.replaceState(null, "", "#" + id);
  if (changed)
    document.querySelector("#product-tab-status").textContent =
      selected.querySelector("b").textContent + " 제품을 표시합니다.";
  if (animate && changed) animatePanel(document.getElementById(id));
  ScrollTrigger.refresh();
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () =>
    activateProduct(tab.dataset.product, { updateUrl: true }),
  );
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    activateProduct(tabs[next].dataset.product, {
      focus: true,
      updateUrl: true,
    });
  });
});
document.querySelectorAll('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    if (tabs.some((tab) => tab.dataset.product === id)) activateProduct(id);
  }),
);
window.addEventListener("hashchange", () =>
  activateProduct(location.hash.slice(1)),
);
activateProduct(
  tabs.some((tab) => tab.dataset.product === location.hash.slice(1))
    ? location.hash.slice(1)
    : tabs[0].dataset.product,
  { animate: false },
);
const media = gsap.matchMedia();
media.add("(prefers-reduced-motion: no-preference)", () => {
  const timelines = new Map(),
    originals = new Map(),
    touched = new Set();
  const play = (el, targets) => {
    if (el.hidden || !targets.length) return;
    timelines.get(el)?.kill();
    gsap.killTweensOf(targets);
    targets.forEach((target) => touched.add(target));
    el.dataset.motionState = "playing";
    const timeline = gsap
      .timeline({
        onComplete: () => {
          el.dataset.motionState = "complete";
        },
      })
      .fromTo(
        targets,
        { y: 32, opacity: 0, scale: 0.985 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.78,
          stagger: 0.13,
          ease: "back.out(1.35)",
          clearProps: "transform,opacity",
        },
      );
    timelines.set(el, timeline);
  };
  document
    .querySelectorAll(".reveal,.hero-stage,.product-tabs,.bottom-cta")
    .forEach((el) => {
      const targets = [...el.children].filter(
        (child) => !child.classList.contains("glow"),
      );
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        onEnter: () => play(el, targets),
        onEnterBack: () => play(el, targets),
      });
    });
  animatePanel = (panel) =>
    play(panel, [
      ...panel.querySelectorAll(
        ".product-label,.feature-copy h2,.feature-copy>p,.feature-copy li,.feature-copy .actions,.feature-copy>small,.mac-browser,.visual-note,.screen-original",
      ),
    ]);
  panels.forEach((panel) =>
    ScrollTrigger.create({
      trigger: panel,
      start: "top 88%",
      onEnter: () => animatePanel(panel),
      onEnterBack: () => animatePanel(panel),
    }),
  );
  document.querySelectorAll("[data-typewriter]").forEach((el) => {
    const text = el.textContent;
    originals.set(el, text);
    const accessible = document.createElement("span");
    accessible.className = "sr-only";
    accessible.textContent = text;
    const visual = document.createElement("span");
    visual.className = "typing-visual";
    visual.setAttribute("aria-hidden", "true");
    for (const char of Array.from(text)) {
      const span = document.createElement("span");
      span.className = "typing-char";
      span.textContent = char;
      visual.append(span);
    }
    el.replaceChildren(accessible, visual);
    const type = () => {
      gsap.killTweensOf(visual.children);
      visual.classList.add("is-typing");
      el.dataset.typingState = "playing";
      gsap.fromTo(
        visual.children,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.01,
          stagger: 0.07,
          ease: "none",
          onComplete: () => {
            visual.classList.remove("is-typing");
            el.dataset.typingState = "complete";
          },
        },
      );
    };
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      onEnter: type,
      onEnterBack: type,
    });
  });
  return () => {
    timelines.forEach((timeline) => timeline.kill());
    touched.forEach((el) => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
    });
    originals.forEach((text, el) => {
      gsap.killTweensOf(el.querySelectorAll(".typing-char"));
      el.textContent = text;
      delete el.dataset.typingState;
    });
    animatePanel = () => {};
  };
});
document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
document
  .querySelectorAll("details")
  .forEach((el) =>
    el.addEventListener("toggle", () => ScrollTrigger.refresh()),
  );
document.querySelector("#inquiry").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget),
    draft = `안녕하세요, ENOTE-LABS 상담을 요청합니다.\n\n관심 제품/업무: ${f.get("product")}\n현재 불편한 일: ${f.get("problem")}\n\n업무 진단과 작은 파일럿 범위를 상담하고 싶습니다.`;
  try {
    await navigator.clipboard.writeText(draft);
    document.querySelector("#form-status").textContent =
      "복사했습니다. 텔레그램 @evanlee97 대화창에 직접 붙여 넣어 보내주세요. 아직 접수되지 않았습니다.";
  } catch {
    document.querySelector("#form-status").textContent =
      "자동 복사가 제한되었습니다. 작성한 내용을 선택해 복사한 뒤 텔레그램에 직접 보내주세요.";
  }
});
