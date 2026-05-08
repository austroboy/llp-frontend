import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldAutoVerify,
  inferClaimFromUserMessage,
  sectionFromCitation,
} from "../heuristic-verify";

const priorWithCitation = {
  role: "assistant",
  content:
    "Under DOC-011 §27, the notice period for permanent workers is 120 days.",
  citations: [
    { document_id: "DOC-011", section: "§27", document: "Bangladesh Labour (Amendment) Act, 2026" },
  ],
};

test("turn 1 → false", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 1,
      user_message: "are you sure it is 120?",
      prior_assistant_turn: priorWithCitation,
      followup_delegation_signaled: false,
    }),
    false,
  );
});

test("turn 2 no prior citations → false", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 2,
      user_message: "are you sure it is 120?",
      prior_assistant_turn: { role: "assistant", content: "some prose", citations: [] },
      followup_delegation_signaled: false,
    }),
    false,
  );
});

test("turn 2 + citation + \"are you sure\" → true", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 2,
      user_message: "are you sure about 120? HR says 60",
      prior_assistant_turn: priorWithCitation,
      followup_delegation_signaled: false,
    }),
    true,
  );
});

test("turn 2 + citation + factual statement no doubt → false", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 2,
      user_message: "thanks, draft me a termination letter for a 6-month employee",
      prior_assistant_turn: priorWithCitation,
      followup_delegation_signaled: false,
    }),
    false,
  );
});

test("turn 2 + citation + section mention → true", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 2,
      user_message: "what does section 27 actually say about overtime?",
      prior_assistant_turn: priorWithCitation,
      followup_delegation_signaled: false,
    }),
    true,
  );
});

test("turn 2 + citation + followup already delegated → false (condition 4)", () => {
  assert.equal(
    shouldAutoVerify({
      turn_index: 2,
      user_message: "are you sure it is 120?",
      prior_assistant_turn: priorWithCitation,
      followup_delegation_signaled: true,
    }),
    false,
  );
});

test("sectionFromCitation: schema form round-trip", () => {
  assert.equal(
    sectionFromCitation({ document_id: "DOC-011", section: "§27" }),
    "DOC-011 §27",
  );
});

test("sectionFromCitation: bare Section N + document_id", () => {
  assert.equal(
    sectionFromCitation({ document_id: "DOC-010", section: "Section 26" }),
    "DOC-010 §26",
  );
});

test("sectionFromCitation: embedded DOC-### §N form", () => {
  assert.equal(
    sectionFromCitation({ section: "DOC-007 §118" }),
    "DOC-007 §118",
  );
});

test("inferClaimFromUserMessage: short challenge anchors on prior", () => {
  const claim = inferClaimFromUserMessage(
    "are you sure it is 120?",
    priorWithCitation,
  );
  assert.match(claim, /120 days/);
  assert.match(claim, /user challenge: are you sure/);
});

test("inferClaimFromUserMessage: standalone long question uses self", () => {
  const longQ =
    "What is the exact statutory penalty amount in taka for failing to pay the contribution to the provident fund on time under the 2015 Labour Rules including any recent amendments?";
  const claim = inferClaimFromUserMessage(longQ, priorWithCitation);
  assert.equal(claim, longQ.slice(0, 500));
});
