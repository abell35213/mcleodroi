# Calculation engine

P1-3 implements deterministic, pure TypeScript calculations for the 21 canonical value modules in `lib/modules`.

Methodology notes:

- Inputs and outputs are typed and calculation functions have no React, Next.js server, database, AI, file, random, or clock dependency.
- Percentage inputs use decimal representation internally: pass 2% as `0.02`, 17% as `0.17`, and 100% as `1`.
- `WEEKS_PER_MONTH` is the canonical constant `4.33` and is used by RFP growth and Short Haul calculations.
- Financial formulas preserve JavaScript number precision. The engine does not call `toFixed`, round financial outputs, or round derived loads, trailers, hours, miles, or gallons before downstream calculations.
- Capacity value represents modeled labor capacity, not automatic cash savings.
- Trailer asset utilization separates `informationalCapitalValue` from the recurring monthly equivalent so avoided capital is not double counted.
- Driver turnover returns an `annualOnlyValue`; its monthly equivalent is exposed only as a derived metric.
