"""Financial arithmetic uses explicit confirmed inputs; no LLM arithmetic."""
from decimal import Decimal
import math
from services.screening import normalized
from services.indictrans_service import numbers

def financials(facts):
    def value(key):
        f=facts.get("finance."+key,{})
        if not f.get("confirmed") or not f.get("validation",{}).get("valid") or f.get("status")!="PROVIDED":
            return None
        claims=f.get("claims",[])
        if not claims or claims[0].get("amount") is None:
            return None
        return claims[0]
    capital=value("initialInvestment")
    available=value("availableCapital")
    requested=value("requestedFunding")
    price=value("sellingPrice")
    cost=value("unitCost")
    sales=value("expectedSales")
    operating=value("monthlyExpenses")
    fixed=operating if operating and operating.get("costBasis")=="fixed" else None
    result={"calculations":{},"warnings":[],"assumptions":[],"scenarios":[]}
    def add(key,amount,formula,unit):
        result["calculations"][key]={"amount":float(Decimal(str(amount)).quantize(Decimal(".01"))),"formula":formula,"unit":unit}
    def same_currency(*claims):
        return all(c and c.get("currency") for c in claims) and len({normalized(c["currency"]) for c in claims})==1
    if capital:
        add("startupCosts",capital["amount"],"Beneficiary-confirmed startup cost total",capital.get("currency"))
    if same_currency(capital,available):
        add("fundingGap",max(0,capital["amount"]-available["amount"]),"max(0, startup costs - own funds)",capital["currency"])
    if requested:
        result["warnings"].append("Funding request requires a documented use-of-funds breakdown; this is not a funding approval.")
    if not fixed:
        result["warnings"].append("Monthly fixed operating costs are missing; net profit and break-even are unavailable.")
    comparable=bool(same_currency(price,cost) and price.get("unit") and normalized(price["unit"])==normalized(cost.get("unit") or ""))
    if comparable and (len(numbers(price["value"]))>1 or len(numbers(cost["value"]))>1):
        comparable=bool(numbers(price["unit"]) and numbers(price["unit"])==numbers(cost["unit"]))
    if comparable:
        contribution=Decimal(str(price["amount"]))-Decimal(str(cost["amount"]))
        add("unitContribution",contribution,"selling price - variable cost per unit",price["currency"]+"/"+price["unit"])
        if contribution<=0:
            result["warnings"].append("Unit contribution is zero or negative. Higher volume cannot cover fixed costs under these assumptions.")
        if sales and sales.get("period")=="month" and normalized(sales.get("unit") or "")==normalized(price["unit"]) and sales["amount"]>=0:
            revenue=Decimal(str(price["amount"]))*Decimal(str(sales["amount"]))
            variable=Decimal(str(cost["amount"]))*Decimal(str(sales["amount"]))
            add("monthlyRevenue",revenue,"unit selling price × monthly sales quantity",price["currency"]+"/month")
            add("monthlyVariableCosts",variable,"variable unit cost × monthly sales quantity",price["currency"]+"/month")
            if operating and operating.get("costBasis")=="total" and same_currency(price,operating) and operating.get("period")=="month":
                add("monthlyOperatingCosts",operating["amount"],"Beneficiary-confirmed total monthly operating costs",price["currency"]+"/month")
                add("estimatedMonthlyProfit",revenue-Decimal(str(operating["amount"])),"estimated monthly revenue - confirmed total monthly operating costs",price["currency"]+"/month")
            result["assumptions"].append("Sales quantities are beneficiary estimates, not verified customer demand.")
            if same_currency(price,fixed) and fixed.get("period")=="month":
                add("monthlyOperatingCosts",variable+Decimal(str(fixed["amount"])),"monthly variable costs + monthly fixed costs",price["currency"]+"/month")
                add("estimatedMonthlyProfit",revenue-variable-Decimal(str(fixed["amount"])),"estimated revenue - variable costs - fixed costs; excludes tax, interest and unreported costs",price["currency"]+"/month")
                for label,factor in [("low",Decimal(".5")),("expected",Decimal("1")),("high",Decimal("1.5"))]:
                    quantity=Decimal(str(sales["amount"]))*factor
                    result["scenarios"].append({"scenario":label,"quantity":float(quantity),"revenue":float(quantity*Decimal(str(price["amount"]))),"profit":float(quantity*contribution-Decimal(str(fixed["amount"]))),"assumption":"Illustrative volume sensitivity, not a forecast"})
        if contribution>0 and same_currency(price,fixed) and fixed.get("period")=="month":
            add("breakEvenQuantity",math.ceil(Decimal(str(fixed["amount"]))/contribution),"ceil(monthly fixed costs / unit contribution)",price["unit"]+"/month")
    else:
        result["warnings"].append("Comparable confirmed unit price, variable cost, currency and unit are required.")
    return result
