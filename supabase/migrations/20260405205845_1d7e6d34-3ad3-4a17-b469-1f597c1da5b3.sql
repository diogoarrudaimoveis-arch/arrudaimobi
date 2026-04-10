
CREATE OR REPLACE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_amenities
  BEFORE UPDATE ON public.amenities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_property_types
  BEFORE UPDATE ON public.property_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
