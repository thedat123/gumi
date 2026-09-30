import AppKit
import Foundation

// Produce the six approved coat colours from the source mascot, preserving face,
// inner ears, belly, line art and transparent antialiasing.
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let source = root.appendingPathComponent("src/assets/gumi.png")
guard let data = try? Data(contentsOf: source), let bitmap = NSBitmapImageRep(data: data) else {
  fatalError("Cannot read Gumi source sprite")
}

let coats: [(String, String)] = [
  ("burgundy", "B83556"), ("rose", "DC97A5"), ("gold", "FAB20A"),
  ("blue", "3966A4"), ("cream", "FADED2"), ("brown", "845747"),
]

func component(_ hex: String, _ offset: Int) -> CGFloat {
  let start = hex.index(hex.startIndex, offsetBy: offset)
  let end = hex.index(start, offsetBy: 2)
  return CGFloat(Int(hex[start..<end], radix: 16)!) / 255
}

for (name, hex) in coats {
  guard let output = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: bitmap.pixelsWide, pixelsHigh: bitmap.pixelsHigh,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
  ) else { fatalError("Cannot create output bitmap") }

  let red = component(hex, 0), green = component(hex, 2), blue = component(hex, 4)
  for y in 0..<bitmap.pixelsHigh {
    for x in 0..<bitmap.pixelsWide {
      guard let pixel = bitmap.colorAt(x: x, y: y) else { continue }
      let r = pixel.redComponent, g = pixel.greenComponent, b = pixel.blueComponent
      let fur = r > 0.67 && g > 0.27 && g < 0.85 && b < 0.28 && r > g * 1.16
      output.setColor(fur ? NSColor(deviceRed: red, green: green, blue: blue, alpha: pixel.alphaComponent) : pixel, atX: x, y: y)
    }
  }
  let target = root.appendingPathComponent("src/assets/gumi-\(name).png")
  guard let png = output.representation(using: .png, properties: [:]) else { fatalError("Cannot encode PNG") }
  try png.write(to: target)
  print("Generated \(target.lastPathComponent)")
}
