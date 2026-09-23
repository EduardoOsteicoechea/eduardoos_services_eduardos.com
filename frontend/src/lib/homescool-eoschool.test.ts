import { describe, expect, it } from "vitest";
import { classifyLessonParas } from "./homescool-eoschool";

describe("classifyLessonParas", () => {
  it("marks lead, cards, practice and error for deepen bodies", () => {
    const body = [
      "Hoy profundizas solo el cráneo. Fija qué protege.",
      "El cráneo es la caja ósea de la cabeza.",
      "Contraste clave: cráneo frente a tórax protege órganos distintos.",
      "Práctica: dibuja un perfil y señala bóveda vs mandíbula.",
      "Error a corregir: decir que el cráneo protege el corazón.",
    ].join("\n\n");

    const paras = classifyLessonParas(body);
    expect(paras.map((p) => p.kind)).toEqual(["lead", "card", "contrast", "practice", "error"]);
    expect(paras[2].left).toBeTruthy();
    expect(paras[2].right).toBeTruthy();
  });

  it("keeps a single paragraph as lead", () => {
    const paras = classifyLessonParas("Solo una idea.");
    expect(paras).toEqual([{ kind: "lead", text: "Solo una idea." }]);
  });
});
