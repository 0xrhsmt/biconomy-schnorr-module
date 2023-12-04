import Schnorrkel from "@borislav.itskov/schnorrkel.js/src/index";

let schnorrkel: Schnorrkel | null;
export function getSchnorrkelInstance() {
  if (!schnorrkel) {
    schnorrkel = new Schnorrkel();
  }
  return schnorrkel;
}
