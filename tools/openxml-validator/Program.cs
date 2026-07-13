using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: dotnet run --project tools/openxml-validator -- <deck.pptx>");
    return 2;
}

using PresentationDocument document = PresentationDocument.Open(args[0], false);
OpenXmlValidator validator = new(FileFormatVersions.Microsoft365);
var errors = validator.Validate(document).ToList();

foreach (var error in errors)
{
    string part = error.Part?.Uri.ToString() ?? "(unknown part)";
    string node = error.Node?.LocalName ?? "(unknown node)";
    Console.Error.WriteLine($"{part} :: {node} :: {error.Description}");
}

if (errors.Count > 0)
{
    Console.Error.WriteLine($"Open XML validation failed with {errors.Count} error(s).");
    return 1;
}

Console.WriteLine("Open XML validation passed with no schema errors.");
return 0;
