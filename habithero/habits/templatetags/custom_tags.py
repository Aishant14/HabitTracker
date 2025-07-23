from django import template

register = template.Library()

@register.simple_tag
def stats_card(icon, value, label, icon_color="text-primary", col_size="3"):
    return (
        f'<div class="col-md-{col_size}">'
        f'    <div class="stats-card">'
        f'        <i class="bi {icon} display-4 mb-3 {icon_color}"></i>'
        f'        <div class="stats-number">{value}</div>'
        f'        <p class="mb-0">{label}</p>'
        f'    </div>'
        f'</div>'
    )

@register.simple_tag
def action_button(url, icon, text, class_name="btn-primary"):
    return (
        f'<a href="{url}" class="btn {class_name}">' 
        f'    <i class="bi {icon} me-2"></i>{text}'
        f'</a>'
    )
