import { describe, expect, it, vi } from "vitest";
import { BACKGROUND_LOCK_MS, createBackgroundTimer } from "./background-lock";

const setup = () => {
  let time = 1000;
  const onExpired = vi.fn();
  const change = createBackgroundTimer(onExpired, () => time);
  return { change, onExpired, wait: (ms: number) => (time += ms) };
};

describe("createBackgroundTimer", () => {
  it("expires on coming back after the limit", () => {
    const { change, onExpired, wait } = setup();
    change(true);
    wait(BACKGROUND_LOCK_MS);
    expect(onExpired).not.toHaveBeenCalled();
    change(false);
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it("doesn't expire on coming back sooner", () => {
    const { change, onExpired, wait } = setup();
    change(true);
    wait(BACKGROUND_LOCK_MS - 1);
    change(false);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("starts again each time the app goes to the background", () => {
    const { change, onExpired, wait } = setup();
    change(true);
    wait(BACKGROUND_LOCK_MS - 1);
    change(false);
    wait(BACKGROUND_LOCK_MS);
    change(true);
    wait(1);
    change(false);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("counts from the first report if the app is reported hidden twice", () => {
    const { change, onExpired, wait } = setup();
    change(true);
    wait(BACKGROUND_LOCK_MS - 1);
    change(true);
    wait(1);
    change(false);
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it("expires if the clock was set back while hidden", () => {
    const { change, onExpired, wait } = setup();
    change(true);
    wait(-1);
    change(false);
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it("ignores coming back without having been hidden", () => {
    const { change, onExpired, wait } = setup();
    wait(BACKGROUND_LOCK_MS);
    change(false);
    expect(onExpired).not.toHaveBeenCalled();
  });
});
