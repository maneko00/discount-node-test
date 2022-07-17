import { useNavigate } from "@shopify/app-bridge-react";
import { useEffect } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/Volume/new');
	}, []);
  
  return (
    <></>
  );
}
