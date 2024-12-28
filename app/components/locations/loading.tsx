import { IndexTable, SkeletonTabs } from "@shopify/polaris";

export function LoadingTable({ headerLength }: { headerLength: number }) {
  return Array.from({ length: 6 }).map((_, index) => {
    return (
      <IndexTable.Row
        id={`filler-${index}`}
        key={`filler-${index}`}
        selected={false}
        position={0}
      >
        {Array(headerLength)
          .fill(0)
          .map((_, index) => {
            return (
              <IndexTable.Cell key={`fillerCell-${index}`}>
                <SkeletonTabs count={1} />
              </IndexTable.Cell>
            );
          })}
      </IndexTable.Row>
    );
  });
}
