export interface RenderableDay {
  readonly date: Date;
  readonly dateKey: string;
  readonly total: number;
  readonly sources?: Readonly<Record<string, number>>;
}

export interface LeveledDay extends RenderableDay {
  readonly level: 0 | 1 | 2 | 3 | 4;
}
