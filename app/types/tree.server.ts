export type Store = {
  geohash: string;
  key: string;
};

export type GeohashLeaf = {
  geohash: string;
  key: string;
};

export type GeohashNode = {
  geohash: string;
  storeCount: number;
  stores?: GeohashLeaf[];
  children: Record<string, GeohashNode>;
};

export type GeohashTree = {
  root: GeohashNode;
  precision: number;
};
