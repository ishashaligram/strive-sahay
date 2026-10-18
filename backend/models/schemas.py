from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class FactItemSchema(BaseModel):
    key: str
    label_en: str
    label_mr: str
    label_hi: str
    value: str = ""
    status: Literal["PROVIDED", "MISSING", "UNCLEAR", "CONFLICTING", "UNKNOWN"] = "MISSING"
    evidence_quote: Optional[str] = None
    source: str = "Initial Submission"
    last_updated: str

class BusinessProfileOverview(BaseModel):
    business_name: FactItemSchema
    trade: FactItemSchema
    product_service: FactItemSchema
    proposed_location: FactItemSchema
    business_stage: FactItemSchema

class BusinessProfileMarket(BaseModel):
    target_customers: FactItemSchema
    customer_problem: FactItemSchema
    demand_evidence: FactItemSchema
    competition: FactItemSchema
    differentiation: FactItemSchema
    sales_channels: FactItemSchema

class BusinessProfileFinance(BaseModel):
    initial_investment: FactItemSchema
    available_capital: FactItemSchema
    unit_cost: FactItemSchema
    selling_price: FactItemSchema
    expected_sales: FactItemSchema
    revenue_assumptions: FactItemSchema
    monthly_expenses: FactItemSchema

class BusinessProfileOperations(BaseModel):
    equipment: FactItemSchema
    suppliers: FactItemSchema
    capacity: FactItemSchema
    skills: FactItemSchema
    staffing: FactItemSchema
    distribution: FactItemSchema

class BusinessProfileRisk(BaseModel):
    market_risks: FactItemSchema
    financial_risks: FactItemSchema
    operational_risks: FactItemSchema
    mitigation: FactItemSchema
    compliance: FactItemSchema

class BusinessProfileSchema(BaseModel):
    id: str
    beneficiary_id: str
    title: str
    trade: str
    submission_type: Literal["text", "audio", "document"]
    original_language: Literal["en", "mr", "hi"]
    original_text: str
    translated_text_en: str
    audio_url: Optional[str] = None
    document_name: Optional[str] = None
    overview: BusinessProfileOverview
    market: BusinessProfileMarket
    finance: BusinessProfileFinance
    operations: BusinessProfileOperations
    risk: BusinessProfileRisk
    completeness_percentage: float = 0.0

class BeneficiaryRegisterRequest(BaseModel):
    full_name: str
    mobile_number: str
    state: str = "Maharashtra"
    district: str
    region: str
    preferred_language: Literal["en", "mr", "hi"] = "mr"
    cohort_id: str
    email: Optional[str] = None
    consent_given: bool

class OTPVerifyRequest(BaseModel):
    mobile_number: str
    otp_code: str
    beneficiary_id: str

class MentorAnswerRequest(BaseModel):
    profile_id: str
    question_id: str
    field_key: str
    answer_text: str
    is_dont_know: bool = False

class AssessorReviewRequest(BaseModel):
    profile_id: str
    assessor_id: str
    decision: Literal["APPROVED_FOR_INCUBATION", "NEEDS_FURTHER_REFINEMENT", "REJECTED"]
    feedback_en: str
    target_language: Literal["en", "mr", "hi"]
    domain_overrides: Dict[str, float] = Field(default_factory=dict)
