"""Insert a namespace block into both locale files before `settings: {`.
Usage: python3 scripts/add-i18n.py <en-block-file> <bn-block-file>"""
import sys
for path, block_file in (("locales/en.ts", sys.argv[1]), ("locales/bn.ts", sys.argv[2])):
    block = open(block_file).read()
    s = open(path).read()
    marker = "  settings: {"
    assert marker in s, path
    s = s.replace(marker, block.rstrip("\n") + "\n" + marker, 1)
    open(path, "w").write(s)
print("ok")
