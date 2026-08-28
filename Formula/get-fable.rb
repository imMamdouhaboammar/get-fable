class GetFable < Formula
  desc "Coding lifecycle discipline and situational awareness for AI coding agents"
  homepage "https://github.com/imMamdouhaboammar/get-fable"
  url "https://github.com/imMamdouhaboammar/get-fable/archive/refs/heads/master.tar.gz"
  version "1.5.0"
  license "MIT"

  depends_on "bun"
  depends_on "python@3"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/get-fable.js" => "get-fable"

    zsh_completion.install "completions/_get-fable"
    bash_completion.install "completions/get-fable.bash" => "get-fable"
    fish_completion.install "completions/get-fable.fish"
  end

  def post_install
    system "#{bin}/get-fable", "doctor" rescue nil
  end

  def caveats
    <<~EOS
      To enable real-time situational awareness and prompt hooks in your shell:

        # Zsh (~/.zshrc)
        eval "$(get-fable shell zsh)"

        # Bash (~/.bashrc)
        eval "$(get-fable shell bash)"

        # Fish (~/.config/fish/config.fish)
        get-fable shell fish | source

      To install global agent hooks and rules for all supported AI agents:
        get-fable install all
    EOS
  end

  test do
    assert_match "get-fable v", shell_output("#{bin}/get-fable version")
    assert_match "idle", shell_output("#{bin}/get-fable spark --json")
  end
end
