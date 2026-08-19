# get-fable Zsh Integration & Situational Awareness Prompt Hook

_fable_in_project() {
  [ -d ".fable" ] || [ -f ".fable/state.json" ]
}

_fable_update_spark_hint() {
  if _fable_in_project; then
    local spark_out
    if command -v get-fable >/dev/null 2>&1; then
      spark_out=$(get-fable spark 2>/dev/null)
    elif [ -f "./bin/get-fable.js" ]; then
      spark_out=$(bun ./bin/get-fable.js spark 2>/dev/null)
    fi
    if [ -n "$spark_out" ]; then
      export FABLE_SPARK_HINT="$spark_out"
    else
      unset FABLE_SPARK_HINT
    fi
  else
    unset FABLE_SPARK_HINT
  fi
}

_fable_chpwd_hook() {
  _fable_update_spark_hint
  if [ -n "$FABLE_SPARK_HINT" ]; then
    echo "\033[0;36m⚡ [fable-spark]\033[0m Next move: \033[1;33m$FABLE_SPARK_HINT\033[0m"
  fi
}

_fable_precmd_hook() {
  _fable_update_spark_hint
}

# Register Zsh hooks safely
autoload -Uz add-zsh-hook 2>/dev/null || true
if type add-zsh-hook >/dev/null 2>&1; then
  add-zsh-hook chpwd _fable_chpwd_hook
  add-zsh-hook precmd _fable_precmd_hook
fi

# Handy Fable Aliases
alias gfr="get-fable route"
alias gfs="get-fable spark"
alias gfe="get-fable evidence"
alias gfc="get-fable card"
alias gfl="get-fable lint"
alias gfd="get-fable doctor"
alias gfm="get-fable mutation"
alias gfst="get-fable status"
