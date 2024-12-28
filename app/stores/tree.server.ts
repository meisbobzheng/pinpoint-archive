import db from "../db.server";

// Finds a brand's tree
export async function findTree(brandHash: string) {
  const tree = await db.tree.findUnique({
    select: {
      tree: true,
    },
    where: {
      brandHash,
    },
  });

  return tree?.tree;
}
