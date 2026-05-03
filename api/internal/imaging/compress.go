package imaging

import (
	"bytes"
	"fmt"
	"io"

	"github.com/disintegration/imaging"
)

const (
	maxWidth    = 2000
	jpegQuality = 85
)

// Compress decodes an image from r, resizes it if wider than maxWidth,
// and re-encodes it as JPEG at quality 85.
// AutoOrientation corrects EXIF rotation from camera/phone photos.
func Compress(r io.Reader) ([]byte, error) {
	img, err := imaging.Decode(r, imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	if img.Bounds().Dx() > maxWidth {
		img = imaging.Resize(img, maxWidth, 0, imaging.Lanczos)
	}

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, img, imaging.JPEG, imaging.JPEGQuality(jpegQuality)); err != nil {
		return nil, fmt.Errorf("encode image: %w", err)
	}
	return buf.Bytes(), nil
}

// CompressPNG decodes an image from r, resizes it if wider than maxWidth,
// and re-encodes it as PNG. Use for logos and images that require transparency.
func CompressPNG(r io.Reader) ([]byte, error) {
	img, err := imaging.Decode(r, imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	if img.Bounds().Dx() > maxWidth {
		img = imaging.Resize(img, maxWidth, 0, imaging.Lanczos)
	}

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, img, imaging.PNG); err != nil {
		return nil, fmt.Errorf("encode image: %w", err)
	}
	return buf.Bytes(), nil
}
