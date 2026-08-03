from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        ser_json_timedelta="iso8601",
    )


class SuccessResponse(CamelModel):
    success: bool = True


class MessageResponse(SuccessResponse):
    message: str | None = None


class EmailActionResponse(MessageResponse):
    """Truthful email dispatch result for auth flows."""

    email_dispatched: bool = False
    delivery_mode: str | None = None


class PageMeta(CamelModel):
    total: int
    page: int
    page_size: int
    has_more: bool


class Page(CamelModel):
    items: list
    total: int
    page: int
    page_size: int
    has_more: bool
