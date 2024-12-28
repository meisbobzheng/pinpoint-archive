import { BlockStack } from "@shopify/polaris";
import { HelpCenterArticles } from "app/util/articles";
import { ArticleItem } from "./article";

export function HelpCenter() {
  return (
    <BlockStack gap="300">
      <ArticleItem
        link={HelpCenterArticles.HOMEPAGE}
        text="Help articles homepage"
      />
      <ArticleItem
        link={HelpCenterArticles.LOCATIONS}
        text="Adding and editing locations to your store locator"
      />
      <ArticleItem
        link={HelpCenterArticles.TAGS}
        text="What are tags and how to use them"
      />
      <ArticleItem
        link={HelpCenterArticles.SETTINGS}
        text="Configuring custom settings for your map"
      />
      <ArticleItem
        link={HelpCenterArticles.ANALYTICS}
        text="Understanding your search analytics"
      />
      <ArticleItem
        link={HelpCenterArticles.INSTALLATION}
        text="How to install your store locator"
      />
    </BlockStack>
  );
}
