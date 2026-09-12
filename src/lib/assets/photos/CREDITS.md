# Photo credits

Stock photos from [Pexels](https://www.pexels.com), used under the [Pexels License](https://www.pexels.com/license/). They show models, not real BubbleBoard families.

| File          | Photo                                                                                                                                                    | Photographer      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `bubbles-*`   | [Children playing with soap bubbles](https://www.pexels.com/photo/children-playing-with-soap-bubbles-6299287/)                                           | Kampus Production |
| `classroom-*` | [Teacher sitting on the floor with children](https://www.pexels.com/photo/mother-and-children-having-a-conversation-while-sitting-on-the-floor-8535577/) | Ksenia Chernaya   |
| `painting-*`  | [Children painting with water colors](https://www.pexels.com/photo/children-painting-with-water-colors-8612967/)                                         | Yan Krukau        |

Each photo is committed pre-optimized with metadata stripped: AVIF (quality 55) at 640, 800, and 1280 px wide, plus an 800 px WebP (quality 78) fallback for browsers without AVIF. Crops from the original downloads: `bubbles` `1916x2396+839+0`, `classroom` `2804x2804+1396+0`, `painting` `4000x5000+0+500`. Regenerate with ImageMagick:

```sh
magick original.jpg -crop <crop> +repage -resize 800x -strip -quality 55 name-800.avif
magick original.jpg -crop <crop> +repage -resize 800x -strip -quality 78 name-800.webp
```

`share.jpg` is the 1200×630 link-preview image, cut from the committed 1280 px `bubbles` AVIF:

```sh
magick bubbles-1280.avif -crop 1280x672+0+190 +repage -resize 1200x630 -strip -quality 82 -interlace JPEG share.jpg
```

Render photos with `src/lib/components/Photo.svelte`, which lists each photo by name. The credits above are also published with the site in `static/third-party-notices.txt`; update both when a photo changes.
