import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerPKG } from '@electron-forge/maker-pkg'
import { VitePlugin } from '@electron-forge/plugin-vite'

export default {
  packagerConfig: {
    asar: true,
    name: 'shellify',
    executableName: 'shellify',
    appBundleId: 'me.yangzhi.shellify',
    appCopyright: 'Copyright (C) 2024 zhi yang',
    appCategoryType: 'public.app-category.utilities',
    extraResource: ['resources'],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'shellify',
      setupExe: 'shellify-${version}-setup.exe',
      setupIcon: './build/icon.ico',
      iconUrl: 'https://raw.githubusercontent.com/electron/electron/main/shell/default_app/icon.ico',
      loadingGif: undefined,
      noMsi: true,
    }),
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerDMG({
      name: 'shellify',
      format: 'ULFO',
      icon: './build/icon.icns',
      contents: [
        {
          x: 130,
          y: 220,
          type: 'file',
          path: null,
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications',
        },
      ],
    }),
    new MakerPKG({
      productName: 'shellify',
      identifier: 'me.yangzhi.shellify',
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.js',
          config: 'vite.main.config.mjs',
          target: 'main',
        },
        {
          entry: 'src/preload/index.js',
          config: 'vite.preload.config.mjs',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),
  ],
  hooks: {
    postPackage: async (config, packageResult) => {
      const fs = await import('fs')
      const path = await import('path')

      const nativeModules = [
        'better-sqlite3',
        'ssh2',
        'cpu-features',
      ]

      for (const mod of nativeModules) {
        const modulePath = path.join(packageResult.outputPaths[0], 'node_modules', mod)
        if (fs.existsSync(modulePath)) {
          console.log(`[Forge] Detected native module: ${mod}`)
        }
      }
    },
  },
}
