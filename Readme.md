# 🚀 JavaScript Application Template with GitHub Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **GitHub Copilot** と **GitHub Coding Agent** を活用したモダンな JavaScript アプリケーション開発のためのテンプレートリポジトリ

## 📋 概要

このリポジトリは、AI 駆動開発ツールを使用して効率的な JavaScript アプリケーション開発を実現するための包括的なテンプレートです。最新の Web 技術スタックと開発手法を組み合わせ、迅速なプロトタイピングから本格的なアプリケーション開発まで対応します。

### ✨ 主な特徴

- 🤖 **AI ファーストな開発体験** - GitHub Copilot & Coding Agent 完全対応
- ⚡ **ゼロ設定で即座に開始** - ブラウザで直接実行可能
- 🎨 **モダンな UI/UX** - Tailwind CSS による美しいデザイン
- 📱 **レスポンシブデザイン** - あらゆるデバイスに対応
- 🛠️ **開発者フレンドリー** - 明確なコーディング規約とベストプラクティス

## 🛠️ 技術スタック

### フロントエンド

| 技術                                     | バージョン | 用途                         |
| ---------------------------------------- | ---------- | ---------------------------- |
| HTML5                                    | Latest     | セマンティックなマークアップ |
| CSS3                                     | Latest     | スタイリング                 |
| [Tailwind CSS](https://tailwindcss.com/) | 3.x (CDN)  | ユーティリティファースト CSS |
| JavaScript                               | ES6+       | インタラクティブな機能       |

### 開発ツール

- **GitHub Copilot** - AI ペアプログラミング
- **GitHub Coding Agent** - 自動コード生成
- **Visual Studio Code** - 推奨 IDE

## 📁 プロジェクト構造

```
📦 JSApp-Template-001/
├── 📄 README.md                 # プロジェクト概要
├── 📄 .github/
│   └── 📄 copilot-instructions.md  # Copilot 設定
└── 📁 src/                      # アプリケーションソース
    ├── 📄 index.html            # メインHTML
    ├── 📁 css/                  # スタイルシート
    │   └── 📄 styles.css        # カスタムCSS
    ├── 📁 js/                   # JavaScript
    │   └── 📄 script.js         # メインスクリプト
    └── 📁 assets/               # 静的リソース
        └── 📁 images/           # 画像ファイル
```

## 🚀 クイックスタート

### 前提条件

- 📌 モダンな Web ブラウザ (Chrome 90+, Firefox 88+, Safari 14+)
- 📌 Visual Studio Code (推奨)
- 📌 GitHub Copilot サブスクリプション

### セットアップ手順

#### 🤖 GitHub Coding Agent を使用する場合

1. **リポジトリの作成**

   ```bash
   # このテンプレートから新しいリポジトリを作成
   gh repo create my-js-app --template JSApp-Template-001
   ```

2. **Issue の作成と Coding Agent の起動**

   - リポジトリに新しい Issue を作成
   - 開発要件を詳細に記述
   - `@copilot` で Coding Agent をアサイン

3. **自動開発プロセス**

   - Coding Agent が要件を分析
   - 自動的にコードを生成
   - Pull Request として提案

4. **レビューとデプロイ**
   - 生成されたコードをレビュー
   - main ブランチにマージ
   - GitHub Pages でライブデモを確認

#### 💻 GitHub Copilot Agent Mode (ローカル開発) を使用する場合

1. **リポジトリのクローン**

   ```bash
   git clone https://github.com/tokawa-ms/JSApp-Template-001.git
   cd JSApp-Template-001
   ```

2. **開発環境の準備**

   ```bash
   # Visual Studio Code で開く
   code .
   ```

3. **Copilot の設定**

   - VS Code で GitHub Copilot 拡張機能を有効化
   - Agent モードに切り替え
   - チャットウィンドウを開く

4. **開発開始**
   - 自然言語でプロンプトを入力
   - Copilot の提案を確認・適用
   - ブラウザで `src/index.html` を開いて動作確認

## 💡 使用例とサンプルプロンプト

### 基本的なアプリケーション作成

```
「ToDoリストアプリを作成してください。追加、削除、完了マークの機能を含めてください。」
```

### インタラクティブな機能追加

```
「現在の天気情報を表示するウィジェットを追加してください。API キーは設定画面で入力できるようにしてください。」
```

### UI/UX の改善

```
「Tailwind CSS を使用してダークモード対応のモダンなデザインに変更してください。」
```

## 📱 レスポンシブデザイン対応

このテンプレートは以下の画面サイズに最適化されています：

- 📱 **モバイル**: 320px〜768px
- 📊 **タブレット**: 768px〜1024px
- 💻 **デスクトップ**: 1024px 以上

## 🔒 セキュリティとベストプラクティス

### API キーの取り扱い

- ✅ 環境変数や UI 入力フィールドを使用
- ❌ ハードコーディングは禁止
- 🔐 開発用のテストキーのみ使用

### コード品質

- 📋 ESLint ルールに準拠
- 📝 適切なコメント記述
- 🧪 エラーハンドリングの実装

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🆘 サポートとリソース

- 📖 **ドキュメント**: [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- 💬 **コミュニティ**: [GitHub Discussions](https://github.com/github/copilot-docs/discussions)
- 🐛 **Issue 報告**: [Issues](https://github.com/tokawa-ms/JSApp-Template-001/issues)

## 📊 プロジェクト統計

![GitHub stars](https://img.shields.io/github/stars/tokawa-ms/JSApp-Template-001?style=social)
![GitHub forks](https://img.shields.io/github/forks/tokawa-ms/JSApp-Template-001?style=social)
![GitHub issues](https://img.shields.io/github/issues/tokawa-ms/JSApp-Template-001)

---

<div align="center">
  <strong>🚀 Happy Coding with AI! 🤖</strong><br>
  Made with ❤️ and GitHub Copilot
</div>
