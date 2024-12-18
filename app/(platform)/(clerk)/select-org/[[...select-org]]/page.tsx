import { OrganizationList } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return <OrganizationList hidePersonal afterSelectOrganizationUrl="/collabration/organization/" afterCreateOrganizationUrl="/collabration/organization/" />;
}