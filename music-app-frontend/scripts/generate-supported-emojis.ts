// scripts/generate-supported-emojis.ts
const fs = require('fs');
const path = require('path');
const twemoji = require('twemoji');
const emojiDataByGroup = require('unicode-emoji-json/data-by-group.json');

// Define interfaces for our data structures
interface EmojiData {
  emoji: string;
  description?: string;
  version?: string;
  name?: string;
  slug?: string;
}

interface EmojiGroup {
  [groupKey: string]: {
    [subgroupKey: string]: EmojiData[] | unknown;
  };
}

// Function to check if Twemoji supports an emoji
function isEmojiSupportedByTwemoji(emoji: string): boolean {
  let isSupported = false;
  
  try {
    twemoji.parse(emoji, {
      callback: function(icon: string) {
        if (icon && icon !== '') {
          isSupported = true;
        }
        return false;
      }
    });
  } catch (error) {
    console.warn(`Error checking emoji ${emoji}:`, error);
  }
  
  return isSupported;
}

// Process emoji data and filter out unsupported ones
function filterSupportedEmojis(data: EmojiGroup): EmojiGroup {
  const result: EmojiGroup = {};
  
  // Process each group
  Object.keys(data).forEach(groupKey => {
    result[groupKey] = {};
    
    // Process each subgroup
    Object.keys(data[groupKey]).forEach(subgroupKey => {
      const subgroup = data[groupKey][subgroupKey];
      
      // Check if the subgroup is an array
      if (!Array.isArray(subgroup)) {
        console.warn(`Subgroup ${subgroupKey} in group ${groupKey} is not an array. Skipping.`);
        return;
      }
      
      result[groupKey][subgroupKey] = [];
      
      // Filter emojis in the subgroup
      subgroup.forEach((emoji: any) => {
        if (emoji && emoji.emoji && isEmojiSupportedByTwemoji(emoji.emoji)) {
          (result[groupKey][subgroupKey] as EmojiData[]).push(emoji);
        } else if (emoji && emoji.emoji) {
          console.log(`Removing unsupported emoji: ${emoji.emoji} (${emoji.slug || emoji.name || 'unnamed'})`);
        }
      });
      
      // Remove empty subgroups
      if ((result[groupKey][subgroupKey] as EmojiData[]).length === 0) {
        delete result[groupKey][subgroupKey];
      }
    });
    
    // Remove empty groups
    if (Object.keys(result[groupKey]).length === 0) {
      delete result[groupKey];
    }
  });
  
  return result;
}

// Helper function for counting emojis
function countEmojis(data: EmojiGroup): number {
  let count = 0;
  
  Object.keys(data).forEach(groupKey => {
    Object.keys(data[groupKey]).forEach(subgroupKey => {
      const subgroup = data[groupKey][subgroupKey];
      if (Array.isArray(subgroup)) {
        count += subgroup.length;
      }
    });
  });
  
  return count;
}

// Debug the structure of the emoji data
console.log("Analyzing emoji data structure...");
Object.keys(emojiDataByGroup).forEach(groupKey => {
  console.log(`Group: ${groupKey}`);
  Object.keys(emojiDataByGroup[groupKey]).forEach(subgroupKey => {
    const subgroup = emojiDataByGroup[groupKey][subgroupKey];
    console.log(`  Subgroup: ${subgroupKey}, Type: ${typeof subgroup}, Is Array: ${Array.isArray(subgroup)}`);
    if (Array.isArray(subgroup) && subgroup.length > 0) {
      console.log(`    First item sample: ${JSON.stringify(subgroup[0])}`);
    }
  });
});

try {
  // Generate and save filtered data
  const supportedEmojiData = filterSupportedEmojis(emojiDataByGroup as EmojiGroup);
  const outputPath = path.join(__dirname, '../utils/supportedEmojiData.json');

  fs.writeFileSync(
    outputPath, 
    JSON.stringify(supportedEmojiData, null, 2), 
    'utf8'
  );

  console.log(`Supported emoji data written to ${outputPath}`);
  console.log(`Original emoji count: ${countEmojis(emojiDataByGroup as EmojiGroup)}`);
  console.log(`Supported emoji count: ${countEmojis(supportedEmojiData)}`);
} catch (error) {
  console.error("Error processing emoji data:", error);
}