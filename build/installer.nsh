!macro customInstall
  WriteRegStr SHELL_CONTEXT "Software\Classes\.md\ShellNew" "NullFile" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\.markdown\ShellNew" "NullFile" ""
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

!macro customUnInstall
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.md\ShellNew" "NullFile"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.md\ShellNew"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.markdown\ShellNew" "NullFile"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.markdown\ShellNew"
!macroend
