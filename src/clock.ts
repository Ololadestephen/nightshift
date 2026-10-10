export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export class ManualClock implements Clock {
  private instant: Date;

  constructor(instant: Date) {
    this.instant = new Date(instant.getTime());
  }

  now(): Date {
    return new Date(this.instant.getTime());
  }

  advance(milliseconds: number): void {
    this.instant = new Date(this.instant.getTime() + milliseconds);
  }
}
