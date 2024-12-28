import type { Store } from "@prisma/client";
import type { ValidatedStore } from "app/types/stores";

interface GeohashLeaf {
  geohash: string;
  key: string;
}

interface GeohashNode {
  geohash: string;
  storeCount: number;
  stores?: GeohashLeaf[];
  children: Record<string, GeohashNode>;
}

type GenericStore = Store | ValidatedStore;

// Our geohash tree, containing data with all stores for a brand
// Its pretty much just a prefix tree with Leafs that contain smartyKeys
export class GeohashTree {
  private root: GeohashNode;
  private precision: number;

  constructor(precision: number = 6) {
    this.root = {
      geohash: "",
      storeCount: 0,
      children: {},
    };
    this.precision = precision;
  }

  insert(store: GenericStore): void {
    const geohash = store.geohash;
    let currentNode = this.root;

    for (let i = 0; i < Math.min(this.precision, geohash.length); i++) {
      const prefix = geohash.substring(0, i + 1);
      const char = geohash[i];

      currentNode.storeCount++;

      if (!currentNode.children[char]) {
        currentNode.children[char] = {
          geohash: prefix,
          storeCount: 0,
          children: {},
        };
      }

      currentNode = currentNode.children[char];

      if (i === Math.min(this.precision, geohash.length) - 1) {
        if (!currentNode.stores) {
          currentNode.stores = [];
        }

        if (!currentNode.stores.find((s) => s.key === store.smartyKey)) {
          currentNode.stores.push({
            geohash: store.geohash,
            key: store.smartyKey,
          });
          currentNode.storeCount++;
        }
      }
    }
  }

  remove(store: GenericStore): boolean {
    const geohash = store.geohash;
    const path: { node: GeohashNode; nextChar: string }[] = [];
    let currentNode = this.root;

    // Step 1: Traverse the tree and store the path
    for (let i = 0; i < Math.min(this.precision, geohash.length) + 1; i++) {
      const char = geohash[i];
      const child = currentNode.children[char];

      path.push({ node: currentNode, nextChar: char });

      if (!child) {
        break;
      }

      currentNode = child;
    }

    for (let i = path.length - 1; i >= 0; i--) {
      const { node, nextChar } = path[i];
      if (node.storeCount > 0) {
        node.storeCount--;
      }

      if (node.storeCount === 0) {
        delete node.stores;
        delete node.children[nextChar];
      } else if (node.children[nextChar]?.storeCount === 0) {
        delete node.children[nextChar];
      }
    }

    return true;
  }

  buildFromStores(stores: GenericStore[]): void {
    stores.forEach((store, index) => {
      this.insert(store);
    });
  }

  getNodesAtLevel(level: number): GeohashNode[] {
    const nodes: GeohashNode[] = [];

    const traverse = (node: GeohashNode) => {
      if (Math.min(this.precision, node.geohash.length) === level) {
        nodes.push(node);
        return;
      }

      Object.values(node.children).forEach((child) => traverse(child));
    };

    traverse(this.root);
    return nodes;
  }

  getStoresInGeohash(prefix: string): GeohashLeaf[] {
    const stores: GeohashLeaf[] = [];

    const findNode = (
      node: GeohashNode,
      remainingPrefix: string,
    ): GeohashNode | null => {
      if (
        remainingPrefix.length === 0 ||
        node.geohash.length === this.precision
      ) {
        return node;
      }

      const nextChar = remainingPrefix[0];
      const child = node.children[nextChar];

      if (!child) return null;

      return findNode(child, remainingPrefix.slice(1));
    };

    const node = findNode(this.root, prefix);
    if (!node) return [];

    const collectStores = (node: GeohashNode) => {
      if (node.stores) {
        stores.push(...node.stores);
      }

      Object.values(node.children).forEach((child) => {
        if (child.geohash.length <= this.precision) {
          collectStores(child);
        }
      });
    };

    collectStores(node);
    return stores;
  }

  print(): void {
    const printNode = (node: GeohashNode, level: number = 0) => {
      const indent = "  ".repeat(level);
      console.log(
        `${indent}${node.geohash || "root"} (${node.storeCount} stores)`,
      );

      Object.values(node.children).forEach((child) => {
        printNode(child, level + 1);
      });
    };

    printNode(this.root);
  }

  toJSON(): string {
    return JSON.stringify(this.root, null, 2);
  }

  // Deserialize a JSON string into a GeohashTree
  static fromJSON(json: string, precision: number = 6): GeohashTree {
    const tree = new GeohashTree(precision);
    const rootNode = JSON.parse(json);

    const buildTreeFromNode = (nodeData: GeohashNode): GeohashNode => {
      const node: GeohashNode = {
        geohash: nodeData.geohash,
        storeCount: nodeData.storeCount,
        stores: nodeData.stores
          ? [...(nodeData.stores as GeohashLeaf[])]
          : undefined,
        children: {},
      };

      // Recursively build children
      for (const [char, childData] of Object.entries(nodeData.children)) {
        node.children[char] = buildTreeFromNode(childData as GeohashNode);
      }

      return node;
    };

    // Reconstruct the root node and assign it to the tree
    tree.root = buildTreeFromNode(rootNode);
    return tree;
  }
}
