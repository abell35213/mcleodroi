# Manual release checklist

## PowerPoint compatibility

On Windows with the .NET SDK installed, validate each generated PPTX with the Microsoft Open XML SDK validator before release:

```powershell
dotnet run --project tools/openxml-validator -- test-results/presentation-golden.pptx
```

Then open the same PPTX in Microsoft PowerPoint and confirm it opens without a repair prompt.

## Mac Next.js Dev Server Recovery

Use this non-destructive recovery sequence when local development reports duplicate dev servers, `(libuv) kqueue(): Too many open files in system`, or `ENFILE: file table overflow`:

```bash
pkill -f "next dev" || true
rm -rf .next
rm -rf node_modules/.cache
ulimit -n 65536
npm run dev -- --webpack
```

Check for duplicate servers before restarting:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
pgrep -fl "next dev"
```

Do not delete local databases as part of routine dev-server recovery.
