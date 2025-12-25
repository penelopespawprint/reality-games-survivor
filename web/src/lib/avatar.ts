// Generate a placeholder avatar URL using DiceBear
export function getAvatarUrl(name: string, photoUrl?: string | null): string {
  if (photoUrl) return photoUrl;

  const encodedName = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&backgroundColor=8B0000&textColor=ffffff&fontSize=40`;
}

// Generate avatar with custom background color
export function getAvatarUrlWithColor(name: string, bgColor: string = '8B0000'): string {
  const encodedName = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&backgroundColor=${bgColor}&textColor=ffffff&fontSize=40`;
}
