#!/bin/bash
# 构建 Mac App Store 混合架构 (universal) 版本
set -e

VERSION=$(node -p "require('./package.json').version")
echo "Building shellify v${VERSION} for Mac App Store (Universal)..."

# 清理之前的构建
rm -rf dist-store/universal dist-store/shellify-*.pkg
mkdir -p dist-store/universal

# Step 1: 构建 arm64 版本
echo "=== Building arm64 ==="
rm -rf dist-store/mas-arm64
npm rebuild --arch=arm64 || true
npm run build
npx electron-builder --mac mas --arm64 --dir --config electron-builder.store.yml

# Step 2: 构建 x64 版本
echo "=== Building x64 ==="
rm -rf dist-store/mas
npm rebuild --arch=x64 || true
npm run build
npx electron-builder --mac mas --x64 --dir --config electron-builder.store.yml

# Step 3: 合并为 universal
echo "=== Creating universal app ==="
UNIVERSAL_APP="dist-store/universal/shellify.app"
rm -rf "$UNIVERSAL_APP"
cp -R dist-store/mas-arm64/shellify.app "$UNIVERSAL_APP"

# 合并 native modules
merge_binary() {
    local arm64_file="$1"
    local x64_file="$2"
    local output_file="$3"
    
    if [ -f "$arm64_file" ] && [ -f "$x64_file" ]; then
        echo "  Merging: $(basename $output_file)"
        lipo -create "$arm64_file" "$x64_file" -output "$output_file"
    fi
}

UNPACK_DIR="$UNIVERSAL_APP/Contents/Resources/app.asar.unpack"

# 合并 better-sqlite3
merge_binary \
    "dist-store/mas-arm64/shellify.app/Contents/Resources/app.asar.unpack/node_modules/better-sqlite3/build/Release/better_sqlite3.node" \
    "dist-store/mas/shellify.app/Contents/Resources/app.asar.unpack/node_modules/better-sqlite3/build/Release/better_sqlite3.node" \
    "$UNPACK_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"

# 合并 cpu-features
merge_binary \
    "dist-store/mas-arm64/shellify.app/Contents/Resources/app.asar.unpack/node_modules/cpu-features/build/Release/cpu_features.node" \
    "dist-store/mas/shellify.app/Contents/Resources/app.asar.unpack/node_modules/cpu-features/build/Release/cpu_features.node" \
    "$UNPACK_DIR/node_modules/cpu-features/build/Release/cpu_features.node"

# 合并 ssh2 的所有 .node 文件
for node_file in $(find "dist-store/mas-arm64/shellify.app/Contents/Resources/app.asar.unpack/node_modules/ssh2" -name "*.node" -type f 2>/dev/null); do
    rel_path="${node_file#dist-store/mas-arm64/shellify.app/Contents/Resources/app.asar.unpack/}"
    mkdir -p "$(dirname "$UNPACK_DIR/$rel_path")"
    merge_binary \
        "dist-store/mas-arm64/shellify.app/Contents/Resources/app.asar.unpack/$rel_path" \
        "dist-store/mas/shellify.app/Contents/Resources/app.asar.unpack/$rel_path" \
        "$UNPACK_DIR/$rel_path"
done

# Step 4: 重新签名
echo "=== Re-signing universal app ==="
codesign -f -s "3rd Party Mac Developer Application: zhi yang (6KQ684K3H7)" "$UNIVERSAL_APP"

# Step 5: 打包为 pkg
echo "=== Creating pkg ==="
productbuild \
    --component "$UNIVERSAL_APP" /Applications \
    --sign "3rd Party Mac Developer Installer: zhi yang (6KQ684K3H7)" \
    "dist-store/shellify-${VERSION}.pkg"

echo ""
echo "=== Done! ==="
echo "Universal pkg: dist-store/shellify-${VERSION}.pkg"
ls -lh "dist-store/shellify-${VERSION}.pkg"
