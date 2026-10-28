import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
const media = gsap.matchMedia();
media.add("(prefers-reduced-motion: no-preference)", () => {
  document
    .querySelectorAll(".reveal")
    .forEach((el) =>
      gsap.from(el, {
        y: 28,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      }),
    );
  gsap.utils
    .toArray(".mock-motion")
    .forEach((el) =>
      gsap.fromTo(
        el,
        { y: 16 },
        {
          y: -10,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      ),
    );
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
    draft = `안녕하세요, Flownote Studio 상담을 요청합니다.\n\n관심 제품/업무: ${f.get("product")}\n현재 불편한 일: ${f.get("problem")}\n\n업무 진단과 작은 파일럿 범위를 상담하고 싶습니다.`;
  try {
    await navigator.clipboard.writeText(draft);
    document.querySelector("#form-status").textContent =
      "복사했습니다. 텔레그램 @evanlee97 대화창에 직접 붙여 넣어 보내주세요. 아직 접수되지 않았습니다.";
  } catch {
    document.querySelector("#form-status").textContent =
      "자동 복사가 제한되었습니다. 작성한 내용을 선택해 복사한 뒤 텔레그램에 직접 보내주세요.";
  }
});
