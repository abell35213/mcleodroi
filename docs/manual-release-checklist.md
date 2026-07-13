# Manual release checklist

## PowerPoint compatibility

On Windows with the .NET SDK installed, validate each generated PPTX with the Microsoft Open XML SDK validator before release:

```powershell
dotnet run --project tools/openxml-validator -- test-results/presentation-golden.pptx
```

Then open the same PPTX in Microsoft PowerPoint and confirm it opens without a repair prompt.
